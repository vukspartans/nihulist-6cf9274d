import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced system prompt optimized for Gemini 3's document processing
const SYSTEM_PROMPT = `אתה מומחה לניתוח מסמכים בתחום הבנייה והנדל"ן בישראל.

## יכולותיך
- קריאת OCR מתקדמת של מסמכים סרוקים
- זיהוי סוגי מסמכים (חוזים, מפרטים, תוכניות, רישיונות)
- חילוץ מידע מובנה מקבצים

## משימה
נתח את הקובץ המצורף להצעת מחיר וספק:

### סוג המסמך
[זהה את סוג המסמך: הצעת מחיר / מפרט טכני / תעודת ביטוח / רישיון / אחר]

### תוכן עיקרי
• [נקודה מרכזית 1]
• [נקודה מרכזית 2]
• [נקודה מרכזית 3]

### רלוונטיות להחלטה
[למה המסמך הזה חשוב לבחירת הספק?]

### פעולות מומלצות
[מה כדאי לבדוק או לוודא?]

## סגנון
- עברית פשוטה וברורה
- תמציתי - מקסימום 150 מילים
- התמקד בעובדות, לא בהשערות`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const { proposalId, fileName, fileUrl, forceRefresh = false } = await req.json();

    if (!proposalId || !fileName) {
      return new Response(JSON.stringify({ error: 'Proposal ID and file name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[analyze-proposal-file] Analyzing file:', fileName, 'for proposal:', proposalId);

    // Get proposal details for context including cached summaries
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select('supplier_name, project_id, file_summaries, files')
      .eq('id', proposalId)
      .single();

    if (proposalError) {
      console.error('[analyze-proposal-file] Proposal not found:', proposalError);
      return new Response(JSON.stringify({ error: 'Proposal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check cache - return cached summary if exists and not forcing refresh
    const existingSummaries = (proposal?.file_summaries as Record<string, string>) || {};
    if (!forceRefresh && existingSummaries[fileName]) {
      console.log('[analyze-proposal-file] Returning cached summary for:', fileName);
      return new Response(JSON.stringify({ 
        success: true, 
        summary: existingSummaries[fileName],
        fileName,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get project details for context
    let projectContext = '';
    if (proposal?.project_id) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select('name, type')
        .eq('id', proposal.project_id)
        .single();
      
      if (project) {
        projectContext = `פרויקט: ${project.name} (${project.type || 'לא צוין'})`;
      }
    }

    // Determine file type from extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = getMimeType(fileExtension);
    const isSupportedForContentAnalysis = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx'].includes(fileExtension);

    let aiResponse;
    let summary = '';

    // Try to download and analyze actual file content if it's a supported format
    if (isSupportedForContentAnalysis && fileUrl) {
      console.log('[analyze-proposal-file] Attempting to analyze actual file content');
      
      try {
        // Extract file path from URL and download from storage
        const filePath = extractFilePath(fileUrl, proposalId);
        console.log('[analyze-proposal-file] Downloading file from path:', filePath);
        
        const { data: fileBlob, error: downloadError } = await supabaseClient.storage
          .from('proposal-files')
          .download(filePath);

        if (downloadError || !fileBlob) {
          console.log('[analyze-proposal-file] Could not download file, falling back to metadata analysis');
          throw new Error('File download failed');
        }

        // Convert blob to base64
        const arrayBuffer = await fileBlob.arrayBuffer();
        const base64Data = base64Encode(new Uint8Array(arrayBuffer));
        
        console.log('[analyze-proposal-file] File downloaded, size:', arrayBuffer.byteLength, 'bytes');

        // Build prompt with file content
        const analysisPrompt = `נתח את הקובץ המצורף להצעת מחיר:

שם קובץ: ${fileName}
ספק: ${proposal?.supplier_name || 'לא ידוע'}
${projectContext}

נא לנתח את תוכן המסמך על פי המבנה שהוגדר.`;

        // Send to Gemini 3 Pro Preview with actual file content
        aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: SYSTEM_PROMPT + "\n\n" + analysisPrompt },
                  { 
                    inlineData: { 
                      mimeType: mimeType, 
                      data: base64Data 
                    } 
                  }
                ]
              }],
              generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.3
              }
            }),
          }
        );

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          summary = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          console.log('[analyze-proposal-file] Gemini analysis with file content successful');
        }
      } catch (fileError) {
        console.log('[analyze-proposal-file] File content analysis failed, using metadata:', fileError);
      }
    }

    // Fallback to metadata-based analysis if file content analysis failed or not applicable
    if (!summary) {
      console.log('[analyze-proposal-file] Using metadata-based analysis');
      
      const metadataPrompt = `נתח קובץ מצורף להצעת מחיר על בסיס המטאדאטה:

=== פרטי הקובץ ===
שם קובץ: ${fileName}
סוג: ${getFileTypeDescription(fileExtension)}
ספק: ${proposal?.supplier_name || 'לא ידוע'}
${projectContext}

=== הנחיות ===
על בסיס שם הקובץ וסוגו, ספק סיכום קצר (2-3 משפטים) של:
1. מה הקובץ כנראה מכיל
2. למה זה רלוונטי להחלטה על ההצעה
3. מה כדאי לבדוק בקובץ

כתוב בעברית פשוטה וטבעית.`;

      aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: metadataPrompt }]
            }],
            generationConfig: {
              maxOutputTokens: 300,
              temperature: 0.3
            }
          }),
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('[analyze-proposal-file] Gemini API error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'שירות AI עמוס, נסה שוב' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Gemini API error: ${aiResponse.status}`);
      }

      const result = await aiResponse.json();
      summary = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    if (!summary) {
      throw new Error('No summary received from AI');
    }

    console.log('[analyze-proposal-file] Summary generated, length:', summary.length);

    // Save summary to database for caching
    const updatedSummaries = { ...existingSummaries, [fileName]: summary };
    const { error: updateError } = await supabaseClient
      .from('proposals')
      .update({ file_summaries: updatedSummaries })
      .eq('id', proposalId);

    if (updateError) {
      console.error('[analyze-proposal-file] Failed to cache summary:', updateError);
    } else {
      console.log('[analyze-proposal-file] Summary cached successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      fileName,
      cached: false,
      model: 'gemini-3-pro-preview'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-proposal-file] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getMimeType(extension: string): string {
  const mimeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeMap[extension] || 'application/octet-stream';
}

function getFileTypeDescription(extension: string): string {
  const typeMap: Record<string, string> = {
    'pdf': 'מסמך PDF',
    'doc': 'מסמך Word',
    'docx': 'מסמך Word',
    'xls': 'גיליון Excel',
    'xlsx': 'גיליון Excel',
    'ppt': 'מצגת PowerPoint',
    'pptx': 'מצגת PowerPoint',
    'jpg': 'תמונה',
    'jpeg': 'תמונה',
    'png': 'תמונה',
    'gif': 'תמונה',
    'dwg': 'שרטוט AutoCAD',
    'dxf': 'שרטוט CAD',
    'zip': 'קובץ דחוס',
    'rar': 'קובץ דחוס',
  };
  return typeMap[extension] || `קובץ ${extension.toUpperCase()}`;
}

function extractFilePath(fileUrl: string, proposalId: string): string {
  // Handle various URL formats to extract the file path
  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/proposal-files/');
    if (pathParts.length > 1) {
      return decodeURIComponent(pathParts[1]);
    }
    // Fallback: assume path includes proposal ID
    return `${proposalId}/${fileUrl.split('/').pop() || 'unknown'}`;
  } catch {
    // If URL parsing fails, try to extract filename
    return `${proposalId}/${fileUrl.split('/').pop() || 'unknown'}`;
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import mammoth from "npm:mammoth@1.6.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// File type categories
const VISION_FORMATS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOCX_FORMATS = ['doc', 'docx'];
const EXCEL_FORMATS = ['xls', 'xlsx'];
const TEXT_FORMATS = ['txt', 'csv', 'md', 'json', 'xml'];

// Enhanced system prompt optimized for Gemini 3's document processing
const SYSTEM_PROMPT = `אתה מומחה לניתוח מסמכים בתחום הבנייה והנדל"ן בישראל.

## יכולותיך
- קריאת OCR מתקדמת של מסמכים סרוקים
- זיהוי סוגי מסמכים (חוזים, מפרטים, תוכניות, רישיונות)
- חילוץ מידע מובנה מקבצים

## משימה
נתח את הקובץ המצורף להצעת מחיר וספק:

### 📋 TL;DR
[משפט אחד - מה הקובץ ומה חשוב בו]

### 📄 סוג המסמך
[הצעת מחיר / מפרט טכני / תעודת ביטוח / רישיון / אחר]

### 🔍 תוכן עיקרי
• [נקודה 1]
• [נקודה 2]
• [נקודה 3]

### 💡 רלוונטיות להחלטה
[למה המסמך הזה חשוב לבחירת הספק?]

### ✅ מה לבדוק
• [בדיקה 1]
• [בדיקה 2]

## סגנון
- עברית פשוטה וברורה
- תמציתי - מקסימום 200 מילים
- התמקד בעובדות`;

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
    
    // Check which analysis method to use
    const isVisionFormat = VISION_FORMATS.includes(fileExtension);
    const isDocxFormat = DOCX_FORMATS.includes(fileExtension);
    const isExcelFormat = EXCEL_FORMATS.includes(fileExtension);
    const isTextFormat = TEXT_FORMATS.includes(fileExtension);
    const isSupportedForContentAnalysis = isVisionFormat || isDocxFormat || isExcelFormat || isTextFormat;

    let summary = '';

    // Try to download and analyze actual file content if it's a supported format
    if (isSupportedForContentAnalysis && fileUrl) {
      console.log('[analyze-proposal-file] Attempting content analysis for:', fileExtension);
      
      try {
        // Extract file path from URL and download from storage
        const filePath = extractFilePath(fileUrl, proposalId);
        console.log('[analyze-proposal-file] Downloading file from path:', filePath);
        
        const { data: fileBlob, error: downloadError } = await supabaseClient.storage
          .from('proposal-files')
          .download(filePath);

        if (downloadError || !fileBlob) {
          console.error('[analyze-proposal-file] Download error:', downloadError);
          throw new Error('File download failed');
        }

        const arrayBuffer = await fileBlob.arrayBuffer();
        console.log('[analyze-proposal-file] File downloaded, size:', arrayBuffer.byteLength, 'bytes');

        // Build analysis prompt
        const analysisPrompt = `נתח את הקובץ המצורף להצעת מחיר:

שם קובץ: ${fileName}
ספק: ${proposal?.supplier_name || 'לא ידוע'}
${projectContext}

נא לנתח את תוכן המסמך על פי המבנה שהוגדר.`;

        let requestBody: any;

        // Route to appropriate processing method based on file type
        if (isVisionFormat) {
          // PDF and images - use native vision with inlineData
          console.log('[analyze-proposal-file] Using VISION analysis for:', fileExtension);
          const base64Data = base64Encode(new Uint8Array(arrayBuffer));
          
          requestBody = {
            contents: [{
              parts: [
                { 
                  inlineData: { 
                    mimeType: mimeType, 
                    data: base64Data 
                  } 
                },
                { text: SYSTEM_PROMPT + "\n\n" + analysisPrompt }
              ]
            }],
            generationConfig: {
              maxOutputTokens: 8192,
              mediaResolution: "MEDIA_RESOLUTION_MEDIUM"
            }
          };
        } else if (isDocxFormat) {
          // DOCX - extract text using mammoth
          console.log('[analyze-proposal-file] Using DOCX TEXT EXTRACTION for:', fileExtension);
          
          let extractedText = '';
          try {
            const result = await mammoth.extractRawText({ buffer: new Uint8Array(arrayBuffer) });
            extractedText = result.value;
            console.log('[analyze-proposal-file] Extracted text length:', extractedText.length);
          } catch (mammothError) {
            console.error('[analyze-proposal-file] Mammoth extraction error:', mammothError);
            throw new Error('DOCX extraction failed');
          }
          
          // Truncate if too long
          if (extractedText.length > 20000) {
            extractedText = extractedText.substring(0, 20000) + '\n\n[...טקסט קוצר עקב אורך...]';
          }
          
          requestBody = {
            contents: [{
              parts: [
                { text: SYSTEM_PROMPT + "\n\n" + analysisPrompt + "\n\n--- תוכן המסמך ---\n\n" + extractedText }
              ]
            }],
            generationConfig: {
              maxOutputTokens: 8192
            }
          };
        } else if (isExcelFormat) {
          // Excel - convert to CSV using xlsx
          console.log('[analyze-proposal-file] Using EXCEL TO CSV CONVERSION for:', fileExtension);
          
          let csvContent = '';
          try {
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            
            // Process each sheet
            const sheetContents: string[] = [];
            for (const sheetName of workbook.SheetNames) {
              const sheet = workbook.Sheets[sheetName];
              const csv = XLSX.utils.sheet_to_csv(sheet);
              sheetContents.push(`--- גיליון: ${sheetName} ---\n${csv}`);
            }
            csvContent = sheetContents.join('\n\n');
            console.log('[analyze-proposal-file] Converted Excel to CSV, length:', csvContent.length);
          } catch (xlsxError) {
            console.error('[analyze-proposal-file] XLSX parsing error:', xlsxError);
            throw new Error('Excel parsing failed');
          }
          
          // Truncate if too long
          if (csvContent.length > 20000) {
            csvContent = csvContent.substring(0, 20000) + '\n\n[...נתונים קוצרו עקב אורך...]';
          }
          
          requestBody = {
            contents: [{
              parts: [
                { text: SYSTEM_PROMPT + "\n\n" + analysisPrompt + "\n\n--- נתוני הגיליון ---\n\n" + csvContent }
              ]
            }],
            generationConfig: {
              maxOutputTokens: 8192
            }
          };
        } else if (isTextFormat) {
          // Text files - read directly
          console.log('[analyze-proposal-file] Using DIRECT TEXT READ for:', fileExtension);
          
          let textContent = '';
          try {
            textContent = await fileBlob.text();
            console.log('[analyze-proposal-file] Read text content, length:', textContent.length);
          } catch (textError) {
            console.error('[analyze-proposal-file] Text read error:', textError);
            throw new Error('Text read failed');
          }
          
          // Truncate if too long
          if (textContent.length > 20000) {
            textContent = textContent.substring(0, 20000) + '\n\n[...טקסט קוצר עקב אורך...]';
          }
          
          requestBody = {
            contents: [{
              parts: [
                { text: SYSTEM_PROMPT + "\n\n" + analysisPrompt + "\n\n--- תוכן הקובץ ---\n\n" + textContent }
              ]
            }],
            generationConfig: {
              maxOutputTokens: 8192
            }
          };
        }

        // Send to Gemini 3 Pro Preview
        console.log('[analyze-proposal-file] Sending to Gemini 3 Pro Preview...');
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-goog-api-key': googleApiKey
            },
            body: JSON.stringify(requestBody),
          }
        );

        console.log('[analyze-proposal-file] Gemini API response status:', aiResponse.status);

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          summary = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          console.log('[analyze-proposal-file] Content analysis successful, length:', summary.length);
        } else {
          const errorText = await aiResponse.text();
          console.error('[analyze-proposal-file] Gemini API error:', aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ error: 'שירות AI עמוס, נסה שוב' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          throw new Error('Gemini API error: ' + aiResponse.status);
        }
      } catch (fileError) {
        console.error('[analyze-proposal-file] Content analysis failed:', fileError);
      }
    }

    // Fallback to metadata-based analysis if file content analysis failed or not applicable
    if (!summary) {
      console.log('[analyze-proposal-file] Using METADATA-BASED analysis (fallback)');
      
      const metadataPrompt = `נתח קובץ מצורף להצעת מחיר:

שם: ${fileName}
סוג: ${getFileTypeDescription(fileExtension)}
ספק: ${proposal?.supplier_name || 'לא ידוע'}
${projectContext}

### 📋 TL;DR
[משפט על מה הקובץ]

### 📄 סוג המסמך
[סוג משוער]

### 💡 רלוונטיות
[למה זה חשוב להחלטה]

### ✅ מה לבדוק
• [בדיקה מומלצת]

⚠️ ניתוח על בסיס שם הקובץ בלבד`;

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': googleApiKey
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: metadataPrompt }]
            }],
            generationConfig: {
              maxOutputTokens: 4096
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
    'txt': 'text/plain',
    'csv': 'text/csv',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
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
    'txt': 'קובץ טקסט',
    'csv': 'קובץ CSV',
    'md': 'קובץ Markdown',
    'json': 'קובץ JSON',
    'xml': 'קובץ XML',
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

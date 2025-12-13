import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced system prompt optimized for Gemini 3's construction document analysis
const SYSTEM_PROMPT = `אתה מהנדס בניין בכיר עם התמחות בניתוח מסמכי פרויקטים בישראל.

## יכולותיך
- קריאת תוכניות אדריכליות וקונסטרוקציה
- הבנת מפרטים טכניים ותקנים ישראליים
- זיהוי דרישות רגולטוריות (תמ"א, היתרי בנייה, תקני בטיחות)

## משימה
נתח את קובץ הפרויקט וספק:

### 📋 TL;DR
[2-3 משפטים - מה הקובץ ומה חשוב בו]

### 📄 סוג המסמך
[היתר בנייה / תוכנית אדריכלית / מפרט טכני / דוח קרקע / אחר]

### 🔍 נקודות מפתח
• [נקודה 1]
• [נקודה 2]
• [נקודה 3]

### 📐 דרישות טכניות
[דרישות עיקריות שעולות מהמסמך]

### ⚖️ רגולציה ותקנים
[תקנים ישראליים רלוונטיים, דרישות ציות]

### 👥 השפעה על בחירת יועצים
[אילו סוגי יועצים נדרשים בהתבסס על המסמך?]

### ✅ פעולות מומלצות
1. [פעולה 1]
2. [פעולה 2]

## סגנון
- עברית מקצועית
- מבנה ברור עם כותרות
- מקסימום 400 מילים`;

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

    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[analyze-project-file] Analyzing file:', fileId);

    // Get file details from database
    const { data: fileData, error: fileError } = await supabaseClient
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      console.error('[analyze-project-file] File not found:', fileError);
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[analyze-project-file] File data:', fileData.file_name);

    // Get project details for context
    const { data: projectData, error: projectError } = await supabaseClient
      .from('projects')
      .select('name, type, location, description, phase')
      .eq('id', fileData.project_id)
      .single();

    if (projectError) {
      console.error('[analyze-project-file] Project not found:', projectError);
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine file type
    const fileExtension = fileData.file_name.split('.').pop()?.toLowerCase() || '';
    const mimeType = getMimeType(fileExtension);
    const isSupportedForContentAnalysis = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx'].includes(fileExtension);

    let analysis = '';

    // Try to download and analyze actual file content if it's a supported format
    if (isSupportedForContentAnalysis && fileData.file_url) {
      console.log('[analyze-project-file] Attempting to analyze actual file content');
      
      try {
        // Extract file path from URL
        const filePath = extractFilePath(fileData.file_url);
        console.log('[analyze-project-file] Downloading file from path:', filePath);
        
        const { data: fileBlob, error: downloadError } = await supabaseClient.storage
          .from('project-files')
          .download(filePath);

        if (downloadError || !fileBlob) {
          console.log('[analyze-project-file] Could not download file, falling back to metadata');
          throw new Error('File download failed');
        }

        // Convert blob to base64
        const arrayBuffer = await fileBlob.arrayBuffer();
        const base64Data = base64Encode(new Uint8Array(arrayBuffer));
        
        console.log('[analyze-project-file] File downloaded, size:', arrayBuffer.byteLength, 'bytes');

        // Build prompt with file content
        const analysisPrompt = `נתח את קובץ הפרויקט המצורף:

שם קובץ: ${fileData.custom_name || fileData.file_name}
גודל: ${fileData.size_mb} MB

פרטי פרויקט:
- שם: ${projectData.name}
- סוג: ${projectData.type || 'לא צוין'}
- מיקום: ${projectData.location || 'לא צוין'}
- שלב: ${projectData.phase || 'לא צוין'}
- תיאור: ${projectData.description || 'לא סופק'}

נא לנתח את תוכן המסמך על פי המבנה שהוגדר.`;

        // Send to Gemini 3 Pro Preview with actual file content
        const aiResponse = await fetch(
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
                maxOutputTokens: 800,
                temperature: 0.3
              }
            }),
          }
        );

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          analysis = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          console.log('[analyze-project-file] Gemini analysis with file content successful');
        } else {
          const errorText = await aiResponse.text();
          console.error('[analyze-project-file] Gemini API error:', aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ error: 'שירות AI עמוס כרגע, נסה שוב מאוחר יותר' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          throw new Error('Gemini API error');
        }
      } catch (fileError) {
        console.log('[analyze-project-file] File content analysis failed, using metadata:', fileError);
      }
    }

    // Fallback to metadata-based analysis if file content analysis failed
    if (!analysis) {
      console.log('[analyze-project-file] Using metadata-based analysis');
      
      const metadataPrompt = `נתח קובץ פרויקט בניה על בסיס המטאדאטה:

שם קובץ: ${fileData.custom_name || fileData.file_name}
סוג קובץ: ${fileData.file_type}
גודל: ${fileData.size_mb} MB

הקשר פרויקט:
- שם: ${projectData.name}
- סוג: ${projectData.type || 'לא צוין'}
- מיקום: ${projectData.location || 'לא צוין'}
- שלב: ${projectData.phase || 'לא צוין'}
- תיאור: ${projectData.description || 'לא סופק'}

הנחיות לפלט:
1. התחל ב‑TL;DR של 2–3 משפטים
2. לאחר מכן רשימת נקודות תמציתית (•) הכוללת:
   - מה הקובץ כנראה מכיל על בסיס שם הקובץ וסוגו
   - דרישות טכניות עיקריות שעשויות להיות בקובץ
   - תקנים/ציות רגולטורי רלוונטיים לסוג קובץ זה
   - השפעה על בחירת ספקים ויועצים
   - נקודות פעולה מומלצות

כתוב בעברית. היה תמציתי ומועיל.`;

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: metadataPrompt }]
            }],
            generationConfig: {
              maxOutputTokens: 600,
              temperature: 0.3
            }
          }),
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('[analyze-project-file] Gemini API error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'שירות AI עמוס כרגע, נסה שוב מאוחר יותר' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Gemini API error: ${aiResponse.status}`);
      }

      const result = await aiResponse.json();
      analysis = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    if (!analysis) {
      throw new Error('No analysis content received from AI');
    }

    // Add metadata disclaimer
    analysis = `📄 **ניתוח קובץ**: ${fileData.custom_name || fileData.file_name}\n\n${analysis}\n\n📋 **המלצה**: לפרטים מדויקים, עיין בקובץ המקורי.`;

    console.log('[analyze-project-file] Analysis completed, length:', analysis.length);

    // Update the file with AI analysis
    const { error: updateError } = await supabaseClient
      .from('project_files')
      .update({ ai_summary: analysis })
      .eq('id', fileId);

    if (updateError) {
      console.error('[analyze-project-file] Failed to update file with analysis:', updateError);
      throw updateError;
    }

    console.log('[analyze-project-file] File analysis saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      model: 'gemini-3-pro-preview'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-project-file] Error:', error);
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

function extractFilePath(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/project-files/');
    if (pathParts.length > 1) {
      return decodeURIComponent(pathParts[1]);
    }
    // Fallback: return everything after the last /object/
    const objectParts = url.pathname.split('/object/');
    if (objectParts.length > 1) {
      const afterObject = objectParts[1];
      const bucketAndPath = afterObject.split('/').slice(1).join('/');
      return decodeURIComponent(bucketAndPath);
    }
    return fileUrl.split('/').pop() || 'unknown';
  } catch {
    return fileUrl.split('/').pop() || 'unknown';
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import mammoth from "https://esm.sh/mammoth@1.6.0";
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
    
    // Check which analysis method to use
    const isVisionFormat = VISION_FORMATS.includes(fileExtension);
    const isDocxFormat = DOCX_FORMATS.includes(fileExtension);
    const isExcelFormat = EXCEL_FORMATS.includes(fileExtension);
    const isTextFormat = TEXT_FORMATS.includes(fileExtension);
    const isSupportedForContentAnalysis = isVisionFormat || isDocxFormat || isExcelFormat || isTextFormat;

    let analysis = '';

    // Try to download and analyze actual file content if it's a supported format
    if (isSupportedForContentAnalysis && fileData.file_url) {
      console.log('[analyze-project-file] Attempting content analysis for:', fileExtension);
      
      try {
        // Download file from storage
        const filePath = fileData.file_url;
        console.log('[analyze-project-file] Downloading file from path:', filePath);
        
        const { data: fileBlob, error: downloadError } = await supabaseClient.storage
          .from('project-files')
          .download(filePath);

        if (downloadError || !fileBlob) {
          console.error('[analyze-project-file] Download error:', downloadError);
          throw new Error('File download failed');
        }

        const arrayBuffer = await fileBlob.arrayBuffer();
        console.log('[analyze-project-file] File downloaded, size:', arrayBuffer.byteLength, 'bytes');

        // Build analysis prompt
        const analysisPrompt = `נתח את קובץ הפרויקט:

שם קובץ: ${fileData.custom_name || fileData.file_name}
גודל: ${fileData.size_mb} MB

פרטי פרויקט:
- שם: ${projectData.name}
- סוג: ${projectData.type || 'לא צוין'}
- מיקום: ${projectData.location || 'לא צוין'}
- שלב: ${projectData.phase || 'לא צוין'}
- תיאור: ${projectData.description || 'לא סופק'}

נא לנתח את תוכן המסמך על פי המבנה שהוגדר.`;

        let requestBody: any;

        // Route to appropriate processing method based on file type
        if (isVisionFormat) {
          // PDF and images - use native vision with inlineData
          console.log('[analyze-project-file] Using VISION analysis for:', fileExtension);
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
          console.log('[analyze-project-file] Using DOCX TEXT EXTRACTION for:', fileExtension);
          
          let extractedText = '';
          try {
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            extractedText = result.value;
            console.log('[analyze-project-file] Extracted text length:', extractedText.length);
          } catch (mammothError) {
            console.error('[analyze-project-file] Mammoth extraction error:', mammothError);
            throw new Error('DOCX extraction failed');
          }
          
          // Truncate if too long (Gemini has context limits)
          if (extractedText.length > 30000) {
            extractedText = extractedText.substring(0, 30000) + '\n\n[...טקסט קוצר עקב אורך...]';
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
          console.log('[analyze-project-file] Using EXCEL TO CSV CONVERSION for:', fileExtension);
          
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
            console.log('[analyze-project-file] Converted Excel to CSV, length:', csvContent.length);
          } catch (xlsxError) {
            console.error('[analyze-project-file] XLSX parsing error:', xlsxError);
            throw new Error('Excel parsing failed');
          }
          
          // Truncate if too long
          if (csvContent.length > 30000) {
            csvContent = csvContent.substring(0, 30000) + '\n\n[...נתונים קוצרו עקב אורך...]';
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
          console.log('[analyze-project-file] Using DIRECT TEXT READ for:', fileExtension);
          
          let textContent = '';
          try {
            textContent = await fileBlob.text();
            console.log('[analyze-project-file] Read text content, length:', textContent.length);
          } catch (textError) {
            console.error('[analyze-project-file] Text read error:', textError);
            throw new Error('Text read failed');
          }
          
          // Truncate if too long
          if (textContent.length > 30000) {
            textContent = textContent.substring(0, 30000) + '\n\n[...טקסט קוצר עקב אורך...]';
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
        console.log('[analyze-project-file] Sending to Gemini 3 Pro Preview...');
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

        console.log('[analyze-project-file] Gemini API response status:', aiResponse.status);

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          console.log('[analyze-project-file] Full API response structure:', JSON.stringify(result).substring(0, 1000));
          
          // Handle various response structures - Gemini 3 may have different format
          const candidate = result.candidates?.[0];
          if (candidate) {
            // Check for content filtering
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'BLOCKED') {
              console.log('[analyze-project-file] Response blocked by safety filter');
              throw new Error('Content blocked by safety filter');
            }
            
            // Try to extract text from various possible locations
            const parts = candidate.content?.parts;
            if (parts && parts.length > 0) {
              // Look for text in any part
              for (const part of parts) {
                if (part.text) {
                  analysis = part.text.trim();
                  break;
                }
              }
            }
            
            // Also check modelVersion and other fields for debugging
            console.log('[analyze-project-file] Candidate finishReason:', candidate.finishReason);
            console.log('[analyze-project-file] Candidate parts count:', parts?.length || 0);
          }
          
          console.log('[analyze-project-file] Content analysis result, length:', analysis.length);
          
          if (!analysis && result.promptFeedback?.blockReason) {
            console.error('[analyze-project-file] Prompt blocked:', result.promptFeedback.blockReason);
            throw new Error('Prompt blocked: ' + result.promptFeedback.blockReason);
          }
        } else {
          const errorText = await aiResponse.text();
          console.error('[analyze-project-file] Gemini API error:', aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ error: 'שירות AI עמוס כרגע, נסה שוב מאוחר יותר' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          throw new Error('Gemini API error: ' + aiResponse.status);
        }
      } catch (fileError) {
        console.error('[analyze-project-file] Content analysis failed:', fileError);
      }
    }

    // Fallback to metadata-based analysis if file content analysis failed
    if (!analysis) {
      console.log('[analyze-project-file] Using METADATA-BASED analysis (fallback)');
      
      const metadataPrompt = `נתח קובץ פרויקט על בסיס המטאדאטה:

שם: ${fileData.custom_name || fileData.file_name}
סוג: ${fileData.file_type} | גודל: ${fileData.size_mb} MB

פרויקט: ${projectData.name} (${projectData.type || 'לא צוין'})
מיקום: ${projectData.location || 'לא צוין'}

### 📋 TL;DR
[2 משפטים על מה הקובץ כנראה מכיל]

### 📄 סוג משוער
[סוג הקובץ המשוער]

### 🔍 תוכן צפוי
• [מה כנראה יש בקובץ]

### 👥 יועצים רלוונטיים
[איזה סוג יועץ צריך לעבוד עם קובץ כזה]

### ✅ פעולות מומלצות
• [מה לעשות עם הקובץ]

⚠️ ניתוח על בסיס מטאדאטה בלבד`;

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
        console.error('[analyze-project-file] Gemini metadata API error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'שירות AI עמוס כרגע, נסה שוב מאוחר יותר' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Gemini API error: ${aiResponse.status}`);
      }

      const result = await aiResponse.json();
      console.log('[analyze-project-file] Metadata analysis response:', JSON.stringify(result).substring(0, 500));
      
      // Extract text from response
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            analysis = part.text.trim();
            break;
          }
        }
      }
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
    'txt': 'text/plain',
    'csv': 'text/csv',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
  };
  return mimeMap[extension] || 'application/octet-stream';
}

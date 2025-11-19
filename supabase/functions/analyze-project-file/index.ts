import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analyzing file:', fileId);

    // Get file details from database
    const { data: fileData, error: fileError } = await supabaseClient
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      console.error('File not found:', fileError);
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('File data:', fileData);

    // Get project details for context
    const { data: projectData, error: projectError } = await supabaseClient
      .from('projects')
      .select('name, type, location, description, phase')
      .eq('id', fileData.project_id)
      .single();

    if (projectError) {
      console.error('Project not found:', projectError);
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download file from Supabase Storage
    const { data: downloadData, error: downloadError } = await supabaseClient
      .storage
      .from('project-files')
      .download(fileData.file_url);

    if (downloadError || !downloadData) {
      console.error('Failed to download file:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('File downloaded successfully, uploading to OpenAI Files API');

    // Upload file to OpenAI Files API
    const formData = new FormData();
    formData.append('file', downloadData, fileData.file_name);
    formData.append('purpose', 'user_data');

    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('OpenAI file upload error:', uploadError);
      throw new Error(`OpenAI file upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('File uploaded to OpenAI:', uploadResult.id);

    // Build analysis prompt with detailed objective
    const analysisPrompt = `
מטרה: נתח את המסמך במלואו, הבן על מה הוא, כיצד הוא משפיע/אמור להשפיע על הפרויקט, וספק תקציר תמציתי עם נקודות פעולה.

הקשר פרויקט:
- שם: ${projectData.name}
- סוג: ${projectData.type}
- מיקום: ${projectData.location}
- שלב: ${projectData.phase}
- תיאור: ${projectData.description || 'לא סופק'}

פרטי קובץ:
- שם: ${fileData.file_name}
- סוג: ${fileData.file_type}
- גודל: ${fileData.size_mb} MB

הנחיות לפלט:
- כתוב בעברית אם שם/תוכן המסמך בעברית, אחרת באנגלית
- התחל ב‑TL;DR של 2–3 משפטים
- לאחר מכן רשימת נקודות תמציתית (•) הכוללת: דרישות טכניות עיקריות, היקפים/כמויות אם קיימים, תקנים/ציות רגולטורי רלוונטיים, הנחות/סיכונים, והשפעה על בחירת ספקים והשלבים הבאים

נתח את כל תוכן המסמך לעומק ותן ניתוח מקיף ומדויק.`;

    console.log('Analyzing file with OpenAI Responses API (Vision)');

    let analysis = '';
    let cleanupFileId = uploadResult.id;

    try {
      // Use Responses API with proper vision input format
      const analysisResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          input: [{
            role: 'user',
            content: [
              { type: 'input_text', text: analysisPrompt },
              { 
                type: 'input_image', 
                file_id: uploadResult.id,
                detail: 'high' // Use high detail for comprehensive analysis
              }
            ]
          }],
          reasoning: {
            effort: 'medium' // Balance between speed and thoroughness
          },
          text: {
            verbosity: 'high' // Request detailed analysis
          }
        }),
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('[OpenAI] Responses API error:', errorText);
        throw new Error(`OpenAI Responses API failed: ${analysisResponse.status}`);
      }

      const analysisResult = await analysisResponse.json();
      console.log('[OpenAI] Analysis completed successfully');
      
      // Extract analysis from response
      analysis = analysisResult.output_text?.trim() || '';

      if (!analysis) {
        throw new Error('No analysis content received from OpenAI');
      }

    } catch (responsesError) {
      console.error('Responses API failed, falling back to Chat Completions:', responsesError);
      
      // Enhanced fallback with metadata-based analysis
      const fallbackPrompt = `נתח קובץ על בסיס המידע הבא:

שם קובץ: ${fileData.custom_name || fileData.file_name}
סוג קובץ: ${fileData.file_type}
גודל: ${fileData.size_mb} MB

הקשר פרויקט:
- שם: ${projectData.name}
- סוג: ${projectData.type}
- מיקום: ${projectData.location}
- שלב: ${projectData.phase}
- תיאור: ${projectData.description || 'לא סופק'}

על בסיס שם הקובץ, סוגו, והקשר הפרויקט, ספק ניתוח כללי של:
1. מה הקובץ עשוי להכיל (לדוגמה: תכניות בניין, מפרט טכני, אישורים)
2. איך הוא רלוונטי לפרויקט ולשלב הנוכחי
3. מה צריך לבדוק בקובץ בצורה ידנית
4. איך זה משפיע על בחירת יועצים וספקים

**חשוב**: זהו ניתוח מבוסס מטא-דאטה בלבד, ללא גישה לתוכן המלא של הקובץ.`;

      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'You are a construction project document analyst specializing in Israeli construction projects. Analyze file metadata to provide actionable insights about project documents.'
            },
            {
              role: 'user',
              content: fallbackPrompt
            }
          ],
          max_completion_tokens: 800,
        }),
      });

      if (fallbackResponse.ok) {
        const fallbackResult = await fallbackResponse.json();
        analysis = fallbackResult.choices?.[0]?.message?.content?.trim() || '';
        
        // Add prominent disclaimer for fallback analysis
        if (analysis) {
          analysis = `⚠️ **הערה חשובה**: ניתוח זה מבוסס על מטא-דאטה של הקובץ בלבד (שם, סוג, הקשר), ללא גישה מלאה לתוכן הקובץ.\n\n${analysis}\n\n📋 **המלצה**: בדוק את הקובץ ידנית לפרטים מדויקים ומלאים.`;
        }
      } else {
        throw new Error('Both Responses API and fallback Chat Completions failed');
      }
    }

    if (!analysis) {
      throw new Error('No analysis content received from OpenAI');
    }

    console.log('AI Analysis completed:', analysis.substring(0, 200) + '...');

    // Update the file with AI analysis
    const { error: updateError } = await supabaseClient
      .from('project_files')
      .update({ ai_summary: analysis })
      .eq('id', fileId);

    if (updateError) {
      console.error('Failed to update file with analysis:', updateError);
      throw updateError;
    }

    console.log('File analysis saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      analysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-project-file function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } finally {
    // Clean up uploaded file from OpenAI
    try {
      if (cleanupFileId) {
        await fetch(`https://api.openai.com/v1/files/${cleanupFileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
          },
        });
        console.log('Cleaned up OpenAI file:', cleanupFileId);
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup OpenAI file:', cleanupError);
    }
  }
});
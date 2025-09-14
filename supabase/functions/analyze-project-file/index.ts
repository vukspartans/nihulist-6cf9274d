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

    console.log('Analyzing file with OpenAI Responses API');

    // Use OpenAI Responses API for comprehensive analysis
    const analysisResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        instructions: 'You are an expert construction project analyst specializing in Israeli construction projects. Provide comprehensive, actionable insights about project files that help with vendor selection and project management. Focus on technical requirements, regulatory compliance, potential challenges, and how the document impacts the project.',
        input: [{
          role: 'user',
          content: [
            { type: 'input_file', file_id: uploadResult.id },
            { type: 'input_text', text: analysisPrompt }
          ]
        }],
        modalities: ['text']
      }),
    });

    let analysis = '';
    let cleanupFileId = uploadResult.id;

    try {
      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('OpenAI Responses API error:', errorText);
        
        // Fallback to Chat Completions API with basic analysis
        console.log('Falling back to Chat Completions API');
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
                content: 'You are an expert construction project analyst specializing in Israeli construction projects. Provide concise, actionable insights about project files that help with vendor selection and project management. Focus on technical requirements, regulatory compliance, and potential challenges.'
              },
              {
                role: 'user',
                content: `${analysisPrompt}\n\nהערה: לא ניתן היה לנתח את תוכן הקובץ ישירות. אנא ספק ניתוח מבוסס על שם הקובץ והקשר הפרויקט.`
              }
            ],
            max_completion_tokens: 500,
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          analysis = fallbackResult.choices?.[0]?.message?.content?.trim() || '';
        }
      } else {
        const analysisResult = await analysisResponse.json();
        console.log('OpenAI analysis completed successfully');
        analysis = analysisResult.output_text?.trim() || '';
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

    } finally {
      // Clean up uploaded file from OpenAI
      try {
        await fetch(`https://api.openai.com/v1/files/${cleanupFileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
          },
        });
        console.log('Cleaned up OpenAI file:', cleanupFileId);
      } catch (cleanupError) {
        console.warn('Failed to cleanup OpenAI file:', cleanupError);
      }
    }

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
  }
});
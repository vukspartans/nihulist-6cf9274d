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

    console.log('Analyzing file with OpenAI Assistants API');

    let assistantId: string | null = null;
    let threadId: string | null = null;

    try {
      // Create assistant with file search capability
      const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          name: 'Project File Analyzer',
          instructions: 'You are an expert construction project analyst specializing in Israeli construction projects. Provide comprehensive, actionable insights about project files that help with vendor selection and project management. Focus on technical requirements, regulatory compliance, potential challenges, and how the document impacts the project. Always respond in Hebrew for Hebrew documents.',
          tools: [{ type: 'file_search' }]
        })
      });

      if (!assistantResponse.ok) {
        throw new Error(`Failed to create assistant: ${await assistantResponse.text()}`);
      }

      const assistant = await assistantResponse.json();
      assistantId = assistant.id;
      console.log('[OpenAI] Assistant created:', assistantId);

      // Create thread with file attached
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: analysisPrompt,
            attachments: [{
              file_id: uploadResult.id,
              tools: [{ type: 'file_search' }]
            }]
          }]
        })
      });

      if (!threadResponse.ok) {
        throw new Error(`Failed to create thread: ${await threadResponse.text()}`);
      }

      const thread = await threadResponse.json();
      threadId = thread.id;
      console.log('[OpenAI] Thread created:', threadId);

      // Run analysis
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: assistantId
        })
      });

      if (!runResponse.ok) {
        throw new Error(`Failed to start run: ${await runResponse.text()}`);
      }

      const run = await runResponse.json();
      console.log('[OpenAI] Run started:', run.id);

      // Poll for completion (max 60 seconds)
      let runStatus = run;
      let pollAttempts = 0;
      const maxPollAttempts = 60;

      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && pollAttempts < maxPollAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        pollAttempts++;
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        runStatus = await statusResponse.json();
        console.log('[OpenAI] Run status:', runStatus.status, `(attempt ${pollAttempts})`);
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Run failed with status: ${runStatus.status}`);
      }

      // Get messages
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${await messagesResponse.text()}`);
      }

      const messages = await messagesResponse.json();
      analysis = messages.data[0]?.content?.[0]?.text?.value || '';
      
      console.log('[OpenAI] Analysis completed successfully');

    } catch (assistantError) {
      console.error('Assistants API failed, falling back to Chat Completions:', assistantError);
      
      // Improved fallback that provides metadata-based analysis
      const fallbackPrompt = `נתח קובץ על בסיס המידע הבא:

שם קובץ: ${fileData.custom_name || fileData.file_name}
סוג קובץ: ${fileData.file_type}
גודל: ${fileData.size_mb} MB
פרויקט: ${projectData.name} (${projectData.type})
מיקום: ${projectData.location}
שלב: ${projectData.phase}

על בסיס שם הקובץ, סוגו, והקשר הפרויקט, ספק ניתוח כללי של מה הקובץ עשוי להכיל ואיך הוא רלוונטי לפרויקט. הדגש את הצורך לבדוק את הקובץ ידנית לפרטים מדויקים.`;

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
              content: 'You are a helpful assistant that analyzes file metadata to provide context about project documents.'
            },
            {
              role: 'user',
              content: fallbackPrompt
            }
          ],
          max_completion_tokens: 500,
        }),
      });

      if (fallbackResponse.ok) {
        const fallbackResult = await fallbackResponse.json();
        analysis = fallbackResult.choices?.[0]?.message?.content?.trim() || '';
        
        // Add disclaimer to fallback analysis
        if (analysis) {
          analysis = `⚠️ ניתוח זה מבוסס על מטא-דאטה בלבד (ללא גישה מלאה לתוכן הקובץ)\n\n${analysis}`;
        }
      }
    } finally {
      // Clean up OpenAI assistant
      if (assistantId) {
        try {
          await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          console.log('[OpenAI] Cleaned up assistant:', assistantId);
        } catch (e) {
          console.warn('Failed to delete assistant:', e);
        }
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
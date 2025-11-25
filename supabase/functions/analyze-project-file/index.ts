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

    let cleanupFileId = '';
    let assistantId = '';

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

    // Check if file type is supported by OpenAI file_search
    const supportedExtensions = ['.pdf', '.txt', '.md', '.doc', '.docx'];
    const fileExtension = fileData.file_name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    const isSupported = supportedExtensions.some(ext => fileExtension === ext);

    console.log(`File type ${fileExtension} supported by Assistants API:`, isSupported);

    let analysis = '';
    cleanupFileId = uploadResult.id;

    if (!isSupported) {
      console.log('File type not supported by Assistants API, using metadata-based analysis');
      
      // Use metadata-based fallback for unsupported file types
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
1. מה הקובץ עשוי להכיל (לדוגמה: תכניות בניין, מפרט טכני, אישורים, נתוני Excel)
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

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        console.error('Fallback analysis failed:', errorText);
        throw new Error(`Fallback analysis failed: ${fallbackResponse.status}`);
      }

      const fallbackResult = await fallbackResponse.json();
      analysis = fallbackResult.choices?.[0]?.message?.content?.trim() || '';
      
      if (analysis) {
        analysis = `⚠️ **הערה חשובה**: ניתוח זה מבוסס על מטא-דאטה של הקובץ בלבד (שם, סוג, הקשר), ללא גישה מלאה לתוכן הקובץ. קבצי ${fileExtension} לא נתמכים כרגע לניתוח אוטומטי מלא.\n\n${analysis}\n\n📋 **המלצה**: בדוק את הקובץ ידנית לפרטים מדויקים ומלאים.`;
      }
    } else {
      console.log('Analyzing file with OpenAI Assistants API');

      try {
      // Step 1: Create assistant with file_search capability
      const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          name: 'Project File Analyzer',
          instructions: 'You are an expert construction project analyst specializing in Israeli construction projects. Analyze the provided document thoroughly and provide comprehensive insights in Hebrew. Focus on technical requirements, specifications, regulatory compliance, quantities, risks, and how this document impacts vendor selection and project execution.',
          tools: [{ type: 'file_search' }]
        })
      });

      if (!assistantResponse.ok) {
        const errorText = await assistantResponse.text();
        console.error('[OpenAI] Failed to create assistant:', errorText);
        throw new Error(`Failed to create assistant: ${assistantResponse.status}`);
      }

      const assistant = await assistantResponse.json();
      assistantId = assistant.id;
      console.log('[OpenAI] Assistant created:', assistantId);

      // Step 2: Create thread with file attached
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
        const errorText = await threadResponse.text();
        console.error('[OpenAI] Failed to create thread:', errorText);
        throw new Error(`Failed to create thread: ${threadResponse.status}`);
      }

      const thread = await threadResponse.json();
      console.log('[OpenAI] Thread created:', thread.id);

      // Step 3: Run analysis
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
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
        const errorText = await runResponse.text();
        console.error('[OpenAI] Failed to start run:', errorText);
        throw new Error(`Failed to start run: ${runResponse.status}`);
      }

      const run = await runResponse.json();
      console.log('[OpenAI] Run started:', run.id);

      // Step 4: Poll for completion (with timeout)
      let runStatus = run;
      let pollCount = 0;
      const maxPolls = 60;

      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        pollCount++;
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        runStatus = await statusResponse.json();
        console.log(`[OpenAI] Run status (${pollCount}s):`, runStatus.status);
      }

      if (runStatus.status !== 'completed') {
        console.error('[OpenAI] Run failed with status:', runStatus.status);
        throw new Error(`Run failed with status: ${runStatus.status}`);
      }

      console.log('[OpenAI] Run completed successfully');

      // Step 5: Get messages (analysis result)
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        const errorText = await messagesResponse.text();
        console.error('[OpenAI] Failed to get messages:', errorText);
        throw new Error(`Failed to get messages: ${messagesResponse.status}`);
      }

      const messages = await messagesResponse.json();
      analysis = messages.data?.[0]?.content?.[0]?.text?.value || '';

      if (!analysis) {
        throw new Error('No analysis content in messages');
      }

      console.log('[OpenAI] Analysis retrieved successfully');

      // Step 6: Clean up assistant
      try {
        await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        console.log('[OpenAI] Assistant cleaned up:', assistantId);
      } catch (cleanupError) {
        console.warn('[OpenAI] Failed to cleanup assistant:', cleanupError);
      }
      } catch (assistantError) {
        console.error('Assistants API failed, falling back to metadata analysis:', assistantError);

      // Enhanced fallback with clear disclaimer
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

      if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          console.error('Fallback analysis failed:', errorText);
          throw new Error(`Both Assistants API and fallback failed. Fallback error: ${errorText}`);
        }

        const fallbackResult = await fallbackResponse.json();
        analysis = fallbackResult.choices?.[0]?.message?.content?.trim() || '';
        
        if (analysis) {
          analysis = `⚠️ **הערה חשובה**: ניתוח זה מבוסס על מטא-דאטה של הקובץ בלבד (שם, סוג, הקשר), ללא גישה מלאה לתוכן הקובץ.\n\n${analysis}\n\n📋 **המלצה**: בדוק את הקובץ ידנית לפרטים מדויקים ומלאים.`;
        } else {
          throw new Error('No analysis content received from fallback');
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
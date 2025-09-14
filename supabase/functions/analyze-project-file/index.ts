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

    // Download and extract text content when possible
    let contentText = '';
    try {
      const { data: downloadData, error: downloadError } = await supabaseClient
        .storage
        .from('project-files')
        .download(fileData.file_url);

      if (downloadError) {
        console.warn('Storage download error:', downloadError);
      } else if (downloadData) {
        const ab = await downloadData.arrayBuffer();
        const bytes = new Uint8Array(ab);

        if (fileData.file_type === 'application/pdf' || fileData.file_type.includes('pdf')) {
          try {
            const pdfjsLib = await import('https://esm.sh/pdfjs-dist@3.11.174/build/pdf.mjs');
            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            const pdf = await loadingTask.promise;
            let textParts: string[] = [];
            const maxPages = Math.min(pdf.numPages, 10);
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdf.getPage(i);
              const tc = await page.getTextContent();
              const pageText = tc.items.map((it: any) => (it?.str ?? it?.text ?? '')).join(' ');
              textParts.push(pageText);
            }
            contentText = textParts.join('\n').slice(0, 12000);
          } catch (e) {
            console.warn('PDF parse failed, continuing without content:', e);
          }
        } else if (fileData.file_type.startsWith('text/') || fileData.file_type.includes('csv')) {
          try {
            contentText = new TextDecoder('utf-8').decode(bytes).slice(0, 20000);
          } catch (e) {
            console.warn('Text decode failed:', e);
          }
        }
      }
    } catch (e) {
      console.warn('Unhandled error reading file content:', e);
    }

    // Build analysis prompt with objective and optional content excerpt
    let analysisPrompt = `
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
`;

    if (contentText) {
      analysisPrompt += `\nקטע תוכן (מוגבל):\n-----\n${contentText}\n-----\n`;
    } else {
      analysisPrompt += `\nהערה: לא התאפשר לחלץ תוכן מהקובץ; ניתוח יתבסס על שם הקובץ והקשר הפרויקט.\n`;
    }


    console.log('Sending analysis request to OpenAI');

    // Call OpenAI for analysis using GPT-5
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction project analyst specializing in Israeli construction projects. Provide concise, actionable insights about project files that help with vendor selection and project management. Focus on technical requirements, regulatory compliance, and potential challenges.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_completion_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error (primary):', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('OpenAI response (primary):', aiResponse);

    const extractContent = (res: any): string => {
      try {
        if (res?.choices?.[0]?.message?.content) return res.choices[0].message.content as string;
        if (res?.choices?.[0]?.text) return res.choices[0].text as string;
        if (Array.isArray(res?.output_text) && res.output_text.length) return res.output_text.join('\n');
      } catch (_) {}
      return '';
    };

    let analysis = extractContent(aiResponse)?.trim() ?? '';

    // Fallback to GPT-4.1 if content is empty
    if (!analysis) {
      console.warn('Primary model returned empty content. Falling back to gpt-4.1-2025-04-14');
      const fallback = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: 'You are an expert construction project analyst specializing in Israeli construction projects. Provide concise, actionable insights about project files that help with vendor selection and project management. Focus on technical requirements, regulatory compliance, and potential challenges.' },
            { role: 'user', content: analysisPrompt }
          ],
          max_completion_tokens: 300,
        }),
      });

      if (!fallback.ok) {
        const t = await fallback.text();
        console.error('OpenAI API error (fallback):', t);
        throw new Error(`OpenAI API error (fallback): ${fallback.status}`);
      }
      const fbJson = await fallback.json();
      console.log('OpenAI response (fallback):', fbJson);
      analysis = extractContent(fbJson)?.trim() ?? '';
    }

    if (!analysis) {
      console.error('AI returned empty analysis after fallback');
      return new Response(JSON.stringify({ success: false, error: 'Empty analysis from AI' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AI Analysis completed:', analysis);

    // Update the file with AI analysis (only if non-empty)
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
  }
});
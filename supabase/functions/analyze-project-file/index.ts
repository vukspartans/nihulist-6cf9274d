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

    // Enhanced analysis prompt with Hebrew context
    let analysisPrompt = `
Analyze this file from an Israeli construction project management perspective.

Project Context:
- Name: ${projectData.name}
- Type: ${projectData.type}
- Location: ${projectData.location}
- Phase: ${projectData.phase}
- Description: ${projectData.description || 'Not provided'}

File Details:
- Name: ${fileData.file_name}
- Type: ${fileData.file_type}
- Size: ${fileData.size_mb} MB

Based on the Hebrew filename and Israeli construction context, please provide a comprehensive analysis (3-4 sentences) focusing on:

1. **Document Type & Purpose**: What type of construction document this appears to be (specifications, tender document, technical drawings, etc.)
2. **Technical Requirements**: Key technical specifications, standards, or requirements that vendors should be aware of
3. **Regulatory Compliance**: Any Israeli building codes, standards (תקנים), or regulatory requirements mentioned
4. **Vendor Selection Impact**: How this document affects supplier/vendor matching and what expertise is needed
5. **Project Phase Alignment**: How this document relates to the current project phase and next steps

Consider Israeli construction industry standards, Hebrew terminology, and local regulatory requirements. 
Respond in Hebrew if the filename or content suggests Hebrew context, otherwise respond in English.
Keep the analysis actionable for project managers seeking to match with appropriate suppliers.
`;

    // For different file types, we would ideally process the content differently
    // For now, we'll analyze based on file name and metadata
    if (fileData.file_type.includes('pdf')) {
      analysisPrompt += "\nThis appears to be a PDF document, likely containing detailed specifications, plans, or documentation.";
    } else if (fileData.file_type.startsWith('image/')) {
      analysisPrompt += "\nThis is an image file, potentially showing site conditions, architectural plans, or reference materials.";
    } else if (fileData.file_type.includes('spreadsheet') || fileData.file_type.includes('excel')) {
      analysisPrompt += "\nThis is a spreadsheet, likely containing calculations, budgets, timelines, or technical specifications.";
    } else if (fileData.file_type.includes('word') || fileData.file_type.includes('document')) {
      analysisPrompt += "\nThis is a document file, probably containing project requirements, specifications, or reports.";
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
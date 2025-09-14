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

    // Prepare analysis prompt based on file type
    let analysisPrompt = `
Analyze this file from a construction project management perspective.

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

Please provide a concise analysis (2-3 sentences) focusing on:
1. What this file contains and its relevance to the project
2. Key technical or business insights that could help with supplier/vendor matching
3. Any important project requirements, specifications, or constraints mentioned

Keep the analysis professional and focused on actionable insights for project management and vendor selection.
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

    // Call OpenAI for analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction project analyst. Provide concise, actionable insights about project files that help with vendor selection and project management.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices[0].message.content;

    console.log('AI Analysis completed:', analysis);

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
      analysis: analysis 
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
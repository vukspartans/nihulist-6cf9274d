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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    // Build analysis prompt
    const analysisPrompt = `נתח קובץ פרויקט בניה על בסיס המידע הבא:

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

    console.log('Sending analysis request to Lovable AI Gateway');

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'אתה מומחה לניתוח מסמכי פרויקטים בתחום הבנייה בישראל. תפקידך לנתח קבצי פרויקט ולספק תובנות מעשיות ליזמים. התמקד בדרישות טכניות, תקנים, רגולציה, והשפעה על בחירת ספקים ויועצים.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'שירות AI עמוס כרגע, נסה שוב מאוחר יותר' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'נדרש טעינת קרדיטים לשירות AI' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    let analysis = aiResult.choices?.[0]?.message?.content?.trim() || '';

    if (!analysis) {
      throw new Error('No analysis content received from AI');
    }

    // Add metadata disclaimer
    analysis = `📄 **ניתוח קובץ**: ${fileData.custom_name || fileData.file_name}\n\n${analysis}\n\n📋 **המלצה**: לפרטים מדויקים, עיין בקובץ המקורי.`;

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
  }
});

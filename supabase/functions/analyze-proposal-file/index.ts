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

    const { proposalId, fileName, fileUrl } = await req.json();

    if (!proposalId || !fileName) {
      return new Response(JSON.stringify({ error: 'Proposal ID and file name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[analyze-proposal-file] Analyzing file:', fileName, 'for proposal:', proposalId);

    // Get proposal details for context
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select('supplier_name, project_id')
      .eq('id', proposalId)
      .single();

    if (proposalError) {
      console.error('[analyze-proposal-file] Proposal not found:', proposalError);
    }

    // Get project details for context
    let projectContext = '';
    if (proposal?.project_id) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select('name, type')
        .eq('id', proposal.project_id)
        .single();
      
      if (project) {
        projectContext = `פרויקט: ${project.name} (${project.type || 'לא צוין'})`;
      }
    }

    // Determine file type from extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const fileTypeDescription = getFileTypeDescription(fileExtension);

    // Build analysis prompt based on file metadata
    const analysisPrompt = `נתח קובץ מצורף להצעת מחיר:

=== פרטי הקובץ ===
שם קובץ: ${fileName}
סוג: ${fileTypeDescription}
ספק: ${proposal?.supplier_name || 'לא ידוע'}
${projectContext}

=== הנחיות ===
על בסיס שם הקובץ וסוגו, ספק סיכום קצר (2-3 משפטים) של:
1. מה הקובץ כנראה מכיל
2. למה זה רלוונטי להחלטה על ההצעה
3. מה כדאי לבדוק בקובץ

כתוב בעברית פשוטה וטבעית. היה תמציתי.`;

    console.log('[analyze-proposal-file] Sending to Lovable AI Gateway');

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
            content: `אתה עוזר מקצועי לחברת יזמות נדל"ן. תפקידך לסייע בבחירת הצעות המחיר הטובות ביותר לפרויקטים.

כשמנתחים קבצים מצורפים להצעות מחיר, התמקד ב:
- מה הקובץ כנראה מכיל על בסיס השם והסוג
- למה זה חשוב להחלטה
- מה כדאי לבדוק

כתוב בעברית פשוטה. תמציתי מאוד - 2-3 משפטים בלבד.`
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
      console.error('[analyze-proposal-file] AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'שירות AI עמוס, נסה שוב' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'נדרש טעינת קרדיטים' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const summary = aiResult.choices?.[0]?.message?.content?.trim() || '';

    if (!summary) {
      throw new Error('No summary received from AI');
    }

    console.log('[analyze-proposal-file] Summary generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      fileName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-proposal-file] Error:', error);
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

function getFileTypeDescription(extension: string): string {
  const typeMap: Record<string, string> = {
    'pdf': 'מסמך PDF',
    'doc': 'מסמך Word',
    'docx': 'מסמך Word',
    'xls': 'גיליון Excel',
    'xlsx': 'גיליון Excel',
    'ppt': 'מצגת PowerPoint',
    'pptx': 'מצגת PowerPoint',
    'jpg': 'תמונה',
    'jpeg': 'תמונה',
    'png': 'תמונה',
    'gif': 'תמונה',
    'dwg': 'שרטוט AutoCAD',
    'dxf': 'שרטוט CAD',
    'zip': 'קובץ דחוס',
    'rar': 'קובץ דחוס',
  };
  
  return typeMap[extension] || `קובץ ${extension.toUpperCase()}`;
}

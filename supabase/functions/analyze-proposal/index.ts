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

    const { proposalId, forceRefresh = false } = await req.json();

    if (!proposalId) {
      return new Response(JSON.stringify({ error: 'Proposal ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[analyze-proposal] Analyzing proposal:', proposalId, 'forceRefresh:', forceRefresh);

    // Get proposal details including cached analysis
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select('*, ai_analysis, ai_analysis_generated_at')
      .eq('id', proposalId)
      .single();

    // Get the RFP invite with request details
    const { data: invite, error: inviteError } = await supabaseClient
      .from('rfp_invites')
      .select(`
        request_title,
        request_content,
        advisor_type,
        rfp_id,
        rfps!inner(
          subject,
          body_html,
          project_id
        )
      `)
      .eq('advisor_id', proposal.advisor_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get project details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('name, type, location, description, phase, budget')
      .eq('id', proposal.project_id)
      .single();

    if (projectError) {
      console.error('[analyze-proposal] Project not found:', projectError);
    }

    // Build analysis prompt
    const rfpRequest = invite ? {
      title: invite.request_title || invite.rfps?.subject || 'לא צוין',
      content: invite.request_content || 'לא צוין',
      advisorType: invite.advisor_type || 'לא צוין'
    } : { title: 'לא נמצא', content: 'לא נמצא', advisorType: 'לא נמצא' };

    const conditionsJson = proposal.conditions_json || {};

    const analysisPrompt = `נתח הצעת מחיר זו מול הדרישות שהוגדרו בבקשה:

=== פרטי הבקשה המקורית ===
כותרת: ${rfpRequest.title}
סוג יועץ: ${rfpRequest.advisorType}
תוכן הבקשה: ${rfpRequest.content}

=== פרטי הפרויקט ===
שם: ${project?.name || 'לא צוין'}
סוג: ${project?.type || 'לא צוין'}
מיקום: ${project?.location || 'לא צוין'}
שלב: ${project?.phase || 'לא צוין'}
תקציב: ${project?.budget ? `₪${project.budget.toLocaleString()}` : 'לא צוין'}
תיאור: ${project?.description || 'לא סופק'}

=== פרטי ההצעה ===
ספק: ${proposal.supplier_name}
מחיר: ₪${proposal.price?.toLocaleString() || 0}
זמן ביצוע: ${proposal.timeline_days} ימים
היקף עבודה: ${proposal.scope_text || 'לא צוין'}

תנאי תשלום: ${conditionsJson.payment_terms || 'לא צוינו'}
הנחות יסוד: ${conditionsJson.assumptions || 'לא צוינו'}
לא כלול: ${conditionsJson.exclusions || 'לא צוין'}
תוקף ההצעה: ${conditionsJson.validity_days || 'לא צוין'} ימים

=== הנחיות לניתוח ===
ספק ניתוח קצר וממוקד הכולל:
1. **התאמה לדרישות** - האם ההצעה עונה על מה שנדרש בבקשה?
2. **סבירות המחיר** - האם המחיר סביר ביחס להיקף?
3. **לוח זמנים** - האם הזמנים ריאליים?
4. **נקודות לתשומת לב** - דברים שכדאי לבדוק או להבהיר
5. **המלצה** - מומלץ / דורש בדיקה נוספת / לא מומלץ

כתוב בעברית פשוטה וטבעית. היה תמציתי ומעשי.`;

    console.log('[analyze-proposal] Sending to Lovable AI Gateway');

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
            content: `אתה מנהל פרויקטי בנייה מקצועי העובד עבור יזם נדל"ן. תפקידך לנתח הצעות מחיר מספקים ולספק הערכה קצרה וברורה.

המטרה שלך היא לעזור ליזם לקבל החלטה מושכלת על ההצעה. התמקד בעובדות, השווה לדרישות המקוריות, והצבע על נקודות חשובות.

כתוב בעברית פשוטה וטבעית. היה ישיר ותמציתי - לא יותר מ-200 מילים.`
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
      console.error('[analyze-proposal] AI Gateway error:', aiResponse.status, errorText);
      
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
    const analysis = aiResult.choices?.[0]?.message?.content?.trim() || '';

    if (!analysis) {
      throw new Error('No analysis content received from AI');
    }

    // Save analysis to database for caching
    const { error: updateError } = await supabaseClient
      .from('proposals')
      .update({
        ai_analysis: analysis,
        ai_analysis_generated_at: new Date().toISOString()
      })
      .eq('id', proposalId);

    if (updateError) {
      console.error('[analyze-proposal] Failed to cache analysis:', updateError);
      // Continue anyway - analysis was generated successfully
    } else {
      console.log('[analyze-proposal] Analysis cached successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      cached: false,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-proposal] Error:', error);
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

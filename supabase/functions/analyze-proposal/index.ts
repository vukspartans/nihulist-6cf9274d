import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced system prompt optimized for GPT-5.2's reasoning capabilities
const SYSTEM_PROMPT = `אתה יועץ בכיר לניהול פרויקטי בנייה בישראל עם 20+ שנות ניסיון. 
אתה מייעץ ליזמי נדל"ן בהערכת הצעות מחיר מספקים ויועצים.

## כללי ניתוח
1. **השווה בקפדנות** את ההצעה לדרישות המקוריות בבקשת הצעת המחיר
2. **זהה פערים** - מה נדרש אך לא נכלל בהצעה
3. **העריך סבירות** - מחיר, לוחות זמנים, היקף ביחס לשוק הישראלי
4. **סמן סיכונים** - תנאים חריגים, הנחות בעייתיות, החרגות משמעותיות

## מבנה תשובה
השתמש במבנה הבא בדיוק:

### התאמה לדרישות
[ניתוח קצר - האם ההצעה עונה על הדרישות?]

### ניתוח מחיר
[האם המחיר סביר? השווה לטווחי מחירים מקובלים בשוק]

### לוח זמנים
[האם ריאלי? זהה תלויות וסיכונים]

### נקודות לתשומת לב ⚠️
• [נקודה 1]
• [נקודה 2]
• [נקודה 3]

### המלצה
🟢 מומלץ לאשר | 🟡 דורש בדיקה/משא ומתן | 🔴 לא מומלץ
[נימוק קצר]

## סגנון
- עברית מקצועית וברורה
- ישיר ותמציתי
- מקסימום 300 מילים`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
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

    if (proposalError || !proposal) {
      console.error('[analyze-proposal] Proposal not found:', proposalError);
      return new Response(JSON.stringify({ error: 'Proposal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    if (inviteError) {
      console.log('[analyze-proposal] Invite not found:', inviteError);
    }

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

נתח את ההצעה על פי המבנה שהוגדר.`;

    console.log('[analyze-proposal] Sending to OpenAI GPT-5.2');

    // Call OpenAI GPT-5.2 directly
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 1500,
        // Note: GPT-5.2 doesn't support temperature parameter
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[analyze-proposal] OpenAI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'שירות AI עמוס כרגע, נסה שוב מאוחר יותר' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402 || aiResponse.status === 403) {
        return new Response(JSON.stringify({ error: 'בעיית הרשאות בשירות AI, פנה לתמיכה' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const analysis = aiResult.choices?.[0]?.message?.content?.trim() || '';

    if (!analysis) {
      throw new Error('No analysis content received from AI');
    }

    console.log('[analyze-proposal] Analysis received, length:', analysis.length);

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
    } else {
      console.log('[analyze-proposal] Analysis cached successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      cached: false,
      generatedAt: new Date().toISOString(),
      model: 'gpt-5.2'
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

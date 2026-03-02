// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// System prompt for SINGLE proposal analysis (no price/timeline sections)
const SYSTEM_PROMPT = `אתה מעריך הצעות בצורה קפדנית ושמרנית.

## כללי בסיס (קריטי)
1. אתה משתמש **רק** במידע שמופיע בנתונים שסופקו לך.
2. אסור להסיק/להמציא. אם נתון חסר/ריק/לא מופיע — כתוב בדיוק: לא סופק
3. **כל הטקסט בעברית**. אסור לערבב אנגלית בפסקאות. אנגלית רק למונחים טכניים/שמות שדות כשהכרחי.
4. **אין ניתוח מחיר** ואין השוואות לשוק/סטנדרטים/ממוצעים (אין לך סט השוואה).
5. הערך את ההצעה בשלושה מימדים חובה: (א) זהות ופרופיל ספק, (ב) אילוצי ארגון היזם (מטבע, תנאי תשלום), (ג) התאמה לדרישות הבקשה.

## מבנה תשובה (השתמש בדיוק בכותרות הללו)

### 📋 TL;DR
[2-3 משפטים תמציתיים]

### 📐 התאמה לדרישות חובה
[ציין את ציון הכיסוי (0-100) שסופק לך. אם missing_mandatory_fee_items או missing_mandatory_scope_items מכילים "אין" – משמעות: אין פריטים חסרים (כיסוי מלא). כתוב: פריטי שכר חסרים: אין. פריטי היקף חסרים: אין. אל תשנה מספרים. אל תשתמש בשמות שדות באנגלית בטקסט.]

### ❓ מה חסר / שאלות חובה ליועץ
• [שאלה 1]
• [שאלה 2]
• [שאלה 3]

### ⚠️ נקודות לתשומת לב
• [נקודה 1]
• [נקודה 2]
• [נקודה 3]

### ✅ המלצה
🟢 מומלץ לאשר | 🟡 דורש בדיקה/משא ומתן | 🔴 לא מומלץ
[נימוק קצר]

## סגנון ועקביות
- עברית מקצועית וברורה – **כל הטקסט בעברית**. אסור להשתמש בשמות שדות באנגלית (כגון missing_mandatory_fee_items) בפסקאות. השתמש: פריטי שכר חסרים, פריטי היקף חסרים.
- "לא סופק" = נתון שחסר/לא הוגש. "אין" = אין פריטים חסרים (כיסוי מלא).
- ישיר ותמציתי
- מקסימום 350 מילים`;

function normalizeText(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function extractFeeLineItems(raw: any): Array<{ item_id?: string; description?: string }> {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((x) => (x && typeof x === "object" ? x : null))
    .filter(Boolean)
    .map((x: any) => ({
      item_id: typeof x.item_id === "string" ? x.item_id : typeof x.id === "string" ? x.id : undefined,
      description: typeof x.description === "string" ? x.description : typeof x.name === "string" ? x.name : undefined,
    }));
}

function extractSelectedServices(raw: any): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.filter((x) => typeof x === "string");
}

function computeMandatoryCoverage(args: {
  rfpFeeItems: Array<{ id: string; description: string; is_optional: boolean }>;
  rfpScopeItems: Array<{ id: string; task_name: string; is_optional: boolean }>;
  proposalFeeLineItems: any;
  proposalSelectedServices: any;
}): {
  coverage_score: number;
  missing_fee: string[];
  missing_scope: string[];
  total_mandatory: number;
  covered_mandatory: number;
} {
  const mandatoryFee = (args.rfpFeeItems || []).filter((i) => !i.is_optional);
  const mandatoryScope = (args.rfpScopeItems || []).filter((i) => !i.is_optional);

  const feeLineItems = extractFeeLineItems(args.proposalFeeLineItems);
  const selectedServices = new Set(extractSelectedServices(args.proposalSelectedServices));

  const feeItemIds = new Set(feeLineItems.map((i) => i.item_id).filter(Boolean));
  const feeItemDesc = new Set(feeLineItems.map((i) => i.description).filter(Boolean).map((d) => normalizeText(d)));

  const missingFee: string[] = [];
  for (const item of mandatoryFee) {
    const byId = item.id ? feeItemIds.has(item.id) : false;
    const byDesc = feeItemDesc.has(normalizeText(item.description));
    if (!byId && !byDesc) missingFee.push(item.description);
  }

  const missingScope: string[] = [];
  for (const item of mandatoryScope) {
    if (!selectedServices.has(item.id)) missingScope.push(item.task_name);
  }

  const total = mandatoryFee.length + mandatoryScope.length;
  const missing = missingFee.length + missingScope.length;
  const covered = Math.max(0, total - missing);
  const score = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round((covered / total) * 100)));

  return { coverage_score: score, missing_fee: missingFee, missing_scope: missingScope, total_mandatory: total, covered_mandatory: covered };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Require OpenAI API key for GPT-5.2
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for proposal analysis');
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

    // Check cache - return cached analysis if available and not forcing refresh
    if (!forceRefresh && proposal.ai_analysis) {
      console.log('[analyze-proposal] Returning cached analysis');
      return new Response(JSON.stringify({ 
        success: true, 
        analysis: proposal.ai_analysis,
        cached: true,
        generatedAt: proposal.ai_analysis_generated_at,
        model: 'cached'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the canonical RFP invite via proposals.rfp_invite_id (fallback to legacy advisor_id+project_id if missing)
    let invite: any = null;
    if (proposal.rfp_invite_id) {
      const { data: inviteById, error: inviteByIdError } = await supabaseClient
        .from('rfp_invites')
        .select('id, rfp_id, advisor_id, advisor_type, status, request_title, request_content, payment_terms, service_details_text')
        .eq('id', proposal.rfp_invite_id)
        .maybeSingle();
      if (!inviteByIdError && inviteById) invite = inviteById;
    }

    if (!invite) {
      const { data: legacyInvite, error: inviteError } = await supabaseClient
        .from('rfp_invites')
        .select(`
          id,
          request_title,
          request_content,
          advisor_type,
          rfp_id,
          status,
          payment_terms,
          service_details_text,
          rfps!inner(project_id)
        `)
        .eq('advisor_id', proposal.advisor_id)
        .eq('rfps.project_id', proposal.project_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inviteError) {
        console.log('[analyze-proposal] Invite not found:', inviteError, 'for advisor:', proposal.advisor_id, 'project:', proposal.project_id);
      } else {
        invite = legacyInvite;
      }
    }

    // Fetch RFP structured requirements (fee items + scope items)
    const inviteId = invite?.id || null;
    let rfpFeeItems: any[] = [];
    let rfpScopeItems: any[] = [];
    if (inviteId) {
      const [{ data: feeItems }, { data: scopeItems }] = await Promise.all([
        supabaseClient
          .from('rfp_request_fee_items')
          .select('id, description, is_optional')
          .eq('rfp_invite_id', inviteId),
        supabaseClient
          .from('rfp_service_scope_items')
          .select('id, task_name, is_optional')
          .eq('rfp_invite_id', inviteId),
      ]);
      rfpFeeItems = feeItems || [];
      rfpScopeItems = scopeItems || [];
    }

    // Get project details (+ owner_id for org context)
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, owner_id, name, type, location, description, phase, budget, advisors_budget, units')
      .eq('id', proposal.project_id)
      .single();

    if (projectError) {
      console.error('[analyze-proposal] Project not found:', projectError);
    }

    // Org context (entrepreneur company) + policies
    let entrepreneurProfile: any = null;
    let entrepreneurCompany: any = null;
    let orgPolicies: any = null;
    if (project?.owner_id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_id, name, company_name, organization_id')
        .eq('user_id', project.owner_id)
        .maybeSingle();
      entrepreneurProfile = profile;

      const orgId = profile?.organization_id || null;
      if (orgId) {
        const { data: company } = await supabaseClient
          .from('companies')
          .select('id, name, type, location, website, description, default_currency, allowed_currencies, payment_terms_policy, procurement_rules')
          .eq('id', orgId)
          .maybeSingle();
        entrepreneurCompany = company;
        if (company) {
          orgPolicies = {
            default_currency: company.default_currency || 'ILS',
            allowed_currencies: Array.isArray(company.allowed_currencies) ? company.allowed_currencies : [company.default_currency || 'ILS'],
            payment_terms_policy: company.payment_terms_policy || {},
            procurement_rules: company.procurement_rules || {},
          };
        }
      }
    }

    // Vendor (advisor + company)
    let vendorCompany: any = null;
    if (proposal.advisor_id) {
      const { data: advisor } = await supabaseClient
        .from('advisors')
        .select('id, company_name, company_id')
        .eq('id', proposal.advisor_id)
        .maybeSingle();
      if (advisor?.company_id) {
        const { data: comp } = await supabaseClient
          .from('companies')
          .select('id, name, registration_number, email, phone')
          .eq('id', advisor.company_id)
          .maybeSingle();
        vendorCompany = comp;
      }
    }

    const coverage = computeMandatoryCoverage({
      rfpFeeItems,
      rfpScopeItems,
      proposalFeeLineItems: proposal.fee_line_items,
      proposalSelectedServices: proposal.selected_services,
    });

    const rfpTitle = invite?.request_title ?? 'לא סופק';
    const rfpContent = invite?.request_content ?? 'לא סופק';
    const advisorType = invite?.advisor_type ?? 'לא סופק';
    const serviceDetails = invite?.service_details_text ?? 'לא סופק';
    const paymentTerms = invite?.payment_terms ?? 'לא סופק';

    const analysisPayload = {
      organization: {
        entrepreneur_name: entrepreneurProfile?.name ?? 'לא סופק',
        company_name: entrepreneurCompany?.name ?? entrepreneurProfile?.company_name ?? 'לא סופק',
        company_location: entrepreneurCompany?.location ?? 'לא סופק',
        policies: orgPolicies ? {
          default_currency: orgPolicies.default_currency,
          allowed_currencies: orgPolicies.allowed_currencies,
          payment_terms_policy: orgPolicies.payment_terms_policy,
        } : null,
      },
      vendor_profile: {
        supplier_name: proposal.supplier_name ?? 'לא סופק',
        company_name: vendorCompany?.name ?? 'לא סופק',
        registration_number: vendorCompany?.registration_number ?? 'לא סופק',
        email: vendorCompany?.email ?? 'לא סופק',
        phone: vendorCompany?.phone ?? 'לא סופק',
      },
      project: {
        name: project?.name ?? 'לא סופק',
        type: project?.type ?? 'לא סופק',
        location: project?.location ?? 'לא סופק',
        phase: project?.phase ?? 'לא סופק',
        budget: project?.budget ?? 'לא סופק',
        advisors_budget: project?.advisors_budget ?? 'לא סופק',
        units: project?.units ?? 'לא סופק',
        description: project?.description ?? 'לא סופק',
      },
      rfp_requirements: {
        title: rfpTitle,
        advisor_type: advisorType,
        content: rfpContent,
        service_details_text: serviceDetails,
        payment_terms: paymentTerms,
        mandatory_fee_items: rfpFeeItems.filter((i) => !i.is_optional).map((i) => ({ id: i.id, description: i.description })),
        mandatory_scope_items: rfpScopeItems.filter((i) => !i.is_optional).map((i) => ({ id: i.id, task_name: i.task_name })),
      },
      proposal: {
        supplier_name: proposal.supplier_name ?? 'לא סופק',
        scope_text: proposal.scope_text ?? 'לא סופק',
        terms: proposal.terms ?? 'לא סופק',
        conditions_json: proposal.conditions_json ?? {},
        fee_line_items: proposal.fee_line_items ?? [],
        selected_services: proposal.selected_services ?? [],
        milestone_adjustments: proposal.milestone_adjustments ?? [],
        consultant_request_notes: proposal.consultant_request_notes ?? proposal.services_notes ?? 'לא סופק',
      },
      deterministic: {
        requirement_coverage_score: coverage.coverage_score,
        total_mandatory: coverage.total_mandatory,
        covered_mandatory: coverage.covered_mandatory,
        missing_mandatory_fee_items: coverage.missing_fee.length ? coverage.missing_fee : ['אין'],
        missing_mandatory_scope_items: coverage.missing_scope.length ? coverage.missing_scope : ['אין'],
      },
    };

    const analysisPrompt = `נתונים לניתוח (JSON). השתמש רק במה שמופיע פה. אם חסר משהו כתוב: לא סופק. כל הטקסט בעברית בלבד.
\n\n${JSON.stringify(analysisPayload, null, 2)}
\n\nהפק ניתוח לפי מבנה הכותרות שהוגדר ב-System Prompt. הערך בשלושה מימדים: ספק, אילוצי ארגון, התאמה לדרישות.`;

    let analysis = '';
    const modelUsed = 'gpt-5.2';

    // Use OpenAI GPT-5.2 directly
    console.log('[analyze-proposal] Using OpenAI gpt-5.2');
    
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.2',
        max_completion_tokens: 1000, // gpt-5.2 uses max_completion_tokens, not max_tokens
        // Note: temperature is NOT supported by gpt-5.2
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[analyze-proposal] OpenAI gpt-5.2 error:', aiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    console.log('[analyze-proposal] OpenAI gpt-5.2 response:', JSON.stringify(aiResult).substring(0, 200));
    
    analysis = aiResult.choices?.[0]?.message?.content?.trim() || '';

    if (!analysis) {
      throw new Error('No analysis content received from AI');
    }

    console.log('[analyze-proposal] Analysis received, length:', analysis.length, 'model:', modelUsed);

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
      model: modelUsed
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

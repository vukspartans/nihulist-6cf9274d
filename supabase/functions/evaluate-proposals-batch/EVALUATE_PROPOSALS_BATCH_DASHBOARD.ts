// @ts-nocheck
/**
 * evaluate-proposals-batch - SINGLE FILE for Supabase Dashboard copy-paste.
 * Copy entire contents to: Edge Functions → evaluate-proposals-batch → index.ts
 * Prerequisite: Run migration 20260203120000_add_organization_policies.sql first.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const EVALUATION_TIMEOUT_MS = 2 * 60 * 1000;

// ---- SCHEMA ----
const EvaluationModeSchema = z.enum(["SINGLE", "COMPARE"]);
const ProjectTypeDetectedSchema = z.enum(["STANDARD", "LARGE_SCALE"]);
const RecommendationLevelSchema = z.enum(["Highly Recommended", "Recommended", "Review Required", "Not Recommended"]);
const FlagsSchema = z.object({
  red_flags: z.array(z.string()),
  green_flags: z.array(z.string()),
  knockout_triggered: z.boolean(),
  knockout_reason: z.string().nullable(),
});
const IndividualAnalysisBaseSchema = z.object({
  requirements_alignment: z.string(),
  timeline_assessment: z.string(),
  experience_assessment: z.string(),
  scope_quality: z.string(),
  fee_structure_assessment: z.string().optional(),
  payment_terms_assessment: z.string().optional(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missing_requirements: z.array(z.string()),
  extra_offerings: z.array(z.string()),
});
const RankedProposalBaseSchema = z.object({
  proposal_id: z.string().uuid(),
  vendor_name: z.string().min(1),
  final_score: z.number().int().min(0).max(100),
  rank: z.number().int().min(1),
  data_completeness: z.number().min(0).max(1),
  recommendation_level: RecommendationLevelSchema,
  flags: FlagsSchema,
});
const RankedProposalSingleSchema = RankedProposalBaseSchema.extend({
  individual_analysis: IndividualAnalysisBaseSchema,
  comparative_notes: z.null(),
});
const RankedProposalCompareSchema = RankedProposalBaseSchema.extend({
  individual_analysis: IndividualAnalysisBaseSchema.extend({ price_assessment: z.string() }),
  comparative_notes: z.string().nullable(),
});
const BatchSummarySingleSchema = z.object({
  total_proposals: z.number().int().min(1),
  project_type_detected: ProjectTypeDetectedSchema,
  price_benchmark_used: z.null(),
  evaluation_mode: z.literal("SINGLE"),
  market_context: z.string().optional(),
});
const BatchSummaryCompareSchema = z.object({
  total_proposals: z.number().int().min(1),
  project_type_detected: ProjectTypeDetectedSchema,
  price_benchmark_used: z.number().positive().nullable(),
  evaluation_mode: z.literal("COMPARE"),
  market_context: z.string().optional(),
});
const EvaluationResultSchema = z.union([
  z.object({ batch_summary: BatchSummarySingleSchema, ranked_proposals: z.array(RankedProposalSingleSchema).min(1) }),
  z.object({ batch_summary: BatchSummaryCompareSchema, ranked_proposals: z.array(RankedProposalCompareSchema).min(1) }),
]);

// ---- PRECHECK ----
function toNumber(x) {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : null;
}
function normalizeCurrency(c) {
  if (!c || typeof c !== "string") return "";
  return c.trim().toUpperCase();
}
function checkCurrencyViolation(proposal, policies) {
  if (!policies?.allowed_currencies?.length) return null;
  const pc = normalizeCurrency(proposal.currency);
  if (!pc) return null;
  const allowed = new Set(policies.allowed_currencies.map((x) => x.toUpperCase()));
  if (allowed.has(pc)) return null;
  return {
    proposal_id: proposal.id,
    type: "CURRENCY",
    message_he: `מטבע ההצעה (${pc}) אינו מותר. המטבעות המורשים: ${policies.allowed_currencies.join(", ")}`,
    message_en: "",
  };
}
function checkPaymentTermsViolation(proposal, policies) {
  if (!policies?.payment_terms_policy || typeof policies.payment_terms_policy !== "object") return null;
  const policy = policies.payment_terms_policy;
  const maxUpfront = typeof policy.max_upfront_percent === "number" ? policy.max_upfront_percent : null;
  if (maxUpfront == null) return null;
  const milestones = Array.isArray(proposal.milestone_adjustments) ? proposal.milestone_adjustments : [];
  let totalUpfront = 0;
  for (const m of milestones) {
    if (typeof m === "object" && m && "percentage" in m) {
      const pct = toNumber(m.percentage);
      const when = String(m.when ?? "").toLowerCase();
      if (pct != null && (when.includes("התחלה") || when.includes("מקדמה") || when.includes("upfront") || when.includes("תחילת")))
        totalUpfront += pct;
    }
  }
  if (totalUpfront > maxUpfront)
    return {
      proposal_id: proposal.id,
      type: "PAYMENT_TERMS",
      message_he: `תנאי התשלום מפרים את מדיניות הארגון: מקדמה ${totalUpfront}% מעל המקסימום המותר (${maxUpfront}%)`,
      message_en: "",
    };
  return null;
}
function checkVendorCompleteness(input, vendorCompany) {
  const vendorName = input.proposal.supplier_name?.trim() || input.advisor.company_name?.trim() || vendorCompany?.name?.trim();
  if (!vendorName)
    return { proposal_id: input.proposal.id, type: "VENDOR_INCOMPLETE", message_he: "פרופיל ספק לא מלא: חסר שם ספק/חברה", message_en: "" };
  return null;
}
function runPreCheck(inputs, policies, vendorCompanies) {
  const all_violations = [];
  for (const input of inputs) {
    const violations = [];
    const vc = vendorCompanies.get(input.advisor.id) ?? null;
    const cv = checkCurrencyViolation(input.proposal, policies);
    if (cv) violations.push(cv);
    const pv = checkPaymentTermsViolation(input.proposal, policies);
    if (pv) violations.push(pv);
    const vv = checkVendorCompleteness(input, vc);
    if (vv) violations.push(vv);
    all_violations.push(...violations);
  }
  return { all_violations };
}

// ---- FETCH ORG POLICIES ----
async function fetchOrganizationPolicies(supabase, owner_id) {
  if (!owner_id) return null;
  const { data: profile, error: pe } = await supabase.from("profiles").select("organization_id").eq("user_id", owner_id).maybeSingle();
  if (pe || !profile?.organization_id) return null;
  const { data: company, error: ce } = await supabase
    .from("companies")
    .select("id, default_currency, allowed_currencies, payment_terms_policy, procurement_rules, required_contract_clauses")
    .eq("id", profile.organization_id)
    .maybeSingle();
  if (ce || !company) return null;
  const allowedCurrencies = Array.isArray(company.allowed_currencies) ? company.allowed_currencies : (company.default_currency ? [company.default_currency] : ["ILS"]);
  return {
    organization_id: company.id,
    policies: {
      organization_id: company.id,
      default_currency: company.default_currency || "ILS",
      allowed_currencies: allowedCurrencies,
      payment_terms_policy: company.payment_terms_policy ?? {},
      procurement_rules: company.procurement_rules ?? {},
      required_contract_clauses: Array.isArray(company.required_contract_clauses) ? company.required_contract_clauses : [],
    },
  };
}

// ---- FETCH VENDOR COMPANIES ----
async function fetchVendorCompanies(supabase, advisorIds) {
  const out = new Map();
  if (advisorIds.length === 0) return out;
  const { data: advisors } = await supabase.from("advisors").select("id, company_id").in("id", advisorIds);
  const companyIds = [...new Set((advisors ?? []).map((a) => a.company_id).filter(Boolean))];
  if (companyIds.length === 0) return out;
  const { data: companies } = await supabase.from("companies").select("id, name, registration_number, email, phone").in("id", companyIds);
  const byId = new Map((companies ?? []).map((c) => [c.id, c]));
  for (const a of advisors ?? []) {
    if (a.company_id && byId.has(a.company_id)) out.set(a.id, byId.get(a.company_id));
  }
  return out;
}

// ---- FETCH EVALUATION INPUTS ----
function pickOne(v) {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
function compareForDedupe(a, b) {
  const av = a.current_version ?? 0, bv = b.current_version ?? 0;
  if (av !== bv) return bv - av;
  const at = a.submitted_at ? Date.parse(a.submitted_at) : 0, bt = b.submitted_at ? Date.parse(b.submitted_at) : 0;
  if (at !== bt) return bt - at;
  return a.id.localeCompare(b.id);
}
async function fetchEvaluationInputs(supabase, args) {
  const { data: project, error: pe } = await supabase.from("projects").select("id, name, type, location, budget, advisors_budget, units, description, is_large_scale, phase, owner_id").eq("id", args.project_id).single();
  if (pe || !project) throw Object.assign(new Error("Project not found"), { status: 404 });

  let q = supabase
    .from("proposals")
    .select(`
      id, project_id, supplier_name, price, currency, timeline_days, scope_text, terms, conditions_json, extracted_text, files,
      advisor_id, rfp_invite_id, fee_line_items, selected_services, milestone_adjustments, consultant_request_notes, services_notes,
      status, submitted_at, current_version,
      advisors!fk_proposals_advisor(id, company_name, company_id, rating, expertise, certifications, founding_year),
      rfp_invite:rfp_invites!rfp_invite_id(id, rfp_id, advisor_id, advisor_type, status, request_title, request_content, payment_terms, service_details_text)
    `)
    .eq("project_id", args.project_id)
    .in("status", ["submitted", "resubmitted", "negotiation_requested"]);
  if (args.proposal_ids?.length) q = q.in("id", args.proposal_ids);

  const { data: rawProposals, error: re } = await q;
  if (re) throw new Error(`Failed to fetch proposals: ${re.message}`);
  const proposals = (rawProposals ?? []) || [];
  if (proposals.length === 0) throw Object.assign(new Error("No proposals found for evaluation"), { status: 400 });

  const withInvite = proposals
    .map((p) => ({ proposal: p, advisor: pickOne(p.advisors), invite: pickOne(p.rfp_invite) }))
    .filter((x) => x.advisor && x.invite && x.invite.status !== "declined" && x.invite.status !== "expired");
  if (withInvite.length === 0) throw Object.assign(new Error("No eligible proposals (missing invite or declined)"), { status: 400 });

  const byInvite = new Map();
  for (const x of withInvite) {
    const id = x.proposal.rfp_invite_id;
    if (!id) continue;
    const list = byInvite.get(id) ?? [];
    list.push(x.proposal);
    byInvite.set(id, list);
  }
  const deduped = [];
  for (const list of byInvite.values()) {
    list.sort(compareForDedupe);
    deduped.push(list[0]);
  }
  const dedupedInputs = deduped.map((p) => {
    const advisor = pickOne(p.advisors), invite = pickOne(p.rfp_invite);
    if (!advisor || !invite) throw Object.assign(new Error("Missing advisor/invite"), { status: 500 });
    return { proposal: p, advisor, rfp_invite: invite };
  });

  if (dedupedInputs.length >= 2) {
    const baseRfp = dedupedInputs[0].rfp_invite.rfp_id, baseType = dedupedInputs[0].rfp_invite.advisor_type;
    for (const x of dedupedInputs) {
      if (x.rfp_invite.rfp_id !== baseRfp) throw Object.assign(new Error("All proposals must belong to same RFP"), { status: 400 });
      if ((x.rfp_invite.advisor_type ?? null) !== (baseType ?? null)) throw Object.assign(new Error("All must share advisor_type"), { status: 400 });
    }
  }

  const baseInvite = dedupedInputs[0].rfp_invite;
  const [{ data: feeItems, error: fe }, { data: scopeItems, error: se }] = await Promise.all([
    supabase.from("rfp_request_fee_items").select("id, rfp_invite_id, description, unit, quantity, is_optional, charge_type, display_order").eq("rfp_invite_id", baseInvite.id),
    supabase.from("rfp_service_scope_items").select("id, rfp_invite_id, task_name, is_optional, fee_category, display_order").eq("rfp_invite_id", baseInvite.id),
  ]);
  if (fe) throw new Error(`Failed to fetch fee items: ${fe.message}`);
  if (se) throw new Error(`Failed to fetch scope items: ${se.message}`);

  const rfp = {
    rfp_id: baseInvite.rfp_id,
    rfp_invite_id: baseInvite.id,
    advisor_type: baseInvite.advisor_type ?? null,
    request_title: baseInvite.request_title ?? null,
    request_content: baseInvite.request_content ?? null,
    payment_terms: baseInvite.payment_terms ?? null,
    service_details_text: baseInvite.service_details_text ?? null,
    fee_items: (feeItems ?? []).map((i) => ({ id: i.id, rfp_invite_id: i.rfp_invite_id, description: i.description, unit: i.unit, quantity: Number(i.quantity ?? 1), is_optional: Boolean(i.is_optional ?? false), charge_type: i.charge_type ?? null, display_order: i.display_order ?? null })),
    service_scope_items: (scopeItems ?? []).map((i) => ({ id: i.id, rfp_invite_id: i.rfp_invite_id, task_name: i.task_name, is_optional: Boolean(i.is_optional ?? false), fee_category: i.fee_category ?? null, display_order: i.display_order ?? null })),
  };

  const organizationAndPolicies = await fetchOrganizationPolicies(supabase, project.owner_id);
  const vendorCompanies = await fetchVendorCompanies(supabase, dedupedInputs.map((x) => x.advisor.id));
  return { project, proposals: dedupedInputs, rfp, organizationAndPolicies, vendorCompanies };
}

// ---- SCORING ----
function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}
function normalizeText(s) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function extractFeeLineItems(p) {
  const raw = Array.isArray(p.fee_line_items) ? p.fee_line_items : [];
  return raw.filter((x) => x && typeof x === "object").map((x) => ({
    item_id: typeof x.item_id === "string" ? x.item_id : typeof x.id === "string" ? x.id : undefined,
    description: typeof x.description === "string" ? x.description : typeof x.name === "string" ? x.name : undefined,
  }));
}
function extractSelectedServices(p) {
  return (Array.isArray(p.selected_services) ? p.selected_services : []).filter((x) => typeof x === "string");
}
function computeRequirementCoverage(rfp, input) {
  const mf = rfp.fee_items.filter((i) => !i.is_optional), ms = rfp.service_scope_items.filter((i) => !i.is_optional);
  const fl = extractFeeLineItems(input.proposal), ss = new Set(extractSelectedServices(input.proposal));
  const ids = new Set(fl.map((i) => i.item_id).filter(Boolean));
  const desc = new Set(fl.map((i) => i.description).filter(Boolean).map((d) => normalizeText(d)));
  const missingFee = mf.filter((i) => !(i.id ? ids.has(i.id) : false) && !desc.has(normalizeText(i.description)));
  const missingScope = ms.filter((i) => !ss.has(i.id));
  const total = mf.length + ms.length, missing = missingFee.length + missingScope.length, covered = Math.max(0, total - missing);
  const score = total === 0 ? 100 : clampInt((covered / total) * 100, 0, 100);
  return { score, total_mandatory: total, covered_mandatory: covered, missing_mandatory_fee_items: missingFee, missing_mandatory_scope_items: missingScope };
}
function computeComparePriceScores(proposals) {
  const prices = proposals.map((p) => ({ id: p.proposal.id, price: toNumber(p.proposal.price) })).filter((x) => typeof x.price === "number" && x.price > 0);
  const out = new Map();
  if (prices.length === 0) return out;
  const min = Math.min(...prices.map((x) => x.price)), max = Math.max(...prices.map((x) => x.price));
  for (const { id, price } of prices) out.set(id, max === min ? 100 : clampInt(((max - price) / (max - min)) * 100, 0, 100));
  return out;
}
function computeDataCompleteness(p) {
  const hasPrice = (toNumber(p.price) ?? 0) > 0, hasTimeline = (toNumber(p.timeline_days) ?? 0) > 0;
  const hasScope = (p.extracted_text || p.scope_text || "").trim().length > 50;
  const hasTerms = (p.terms || "").trim().length > 0, hasFee = Array.isArray(p.fee_line_items) && p.fee_line_items.length > 0;
  const hasSel = Array.isArray(p.selected_services) && p.selected_services.length > 0, hasMil = Array.isArray(p.milestone_adjustments) && p.milestone_adjustments.length > 0;
  const s = (hasPrice ? 0.18 : 0) + (hasTimeline ? 0.08 : 0) + (hasScope ? 0.2 : 0) + (hasTerms ? 0.08 : 0) + (hasFee ? 0.22 : 0) + (hasSel ? 0.12 : 0) + (hasMil ? 0.12 : 0);
  return Math.max(0, Math.min(1, Math.round(s * 100) / 100));
}
function recommendationFromScore(score) {
  if (score >= 80) return "Highly Recommended";
  if (score >= 60) return "Recommended";
  if (score >= 40) return "Review Required";
  return "Not Recommended";
}
function getPolicyRedFlags(pid, violations) {
  return violations.filter((v) => v.proposal_id === pid).map((v) => v.message_he);
}
function getVendorCompletenessFlags(input, vc) {
  const n = input.proposal.supplier_name?.trim() || input.advisor.company_name?.trim() || vc?.name?.trim();
  return !n ? ["פרופיל ספק לא מלא: חסר שם ספק/חברה"] : [];
}
function computeDeterministicScores(mode, rfp, proposals, opts = {}) {
  const priceScores = mode === "COMPARE" ? computeComparePriceScores(proposals) : new Map();
  const violations = opts.policyViolations ?? [];
  const vendorCos = opts.vendorCompanies ?? new Map();

  return proposals.map((p) => {
    const cov = computeRequirementCoverage(rfp, p);
    const priceScore = priceScores.get(p.proposal.id);
    const policyFlags = getPolicyRedFlags(p.proposal.id, violations);
    const vendorFlags = getVendorCompletenessFlags(p, vendorCos.get(p.advisor.id) ?? null);
    const missRatio = cov.total_mandatory === 0 ? 0 : (cov.total_mandatory - cov.covered_mandatory) / cov.total_mandatory;
    const policyKo = violations.some((v) => v.proposal_id === p.proposal.id && (v.type === "CURRENCY" || v.type === "PAYMENT_TERMS"));
    const covKo = cov.total_mandatory > 0 && missRatio > 0.5;
    const knockout = policyKo || covKo;
    const hint = policyKo ? (policyFlags[0] ?? "הפרת מדיניות ארגונית") : covKo ? "חסרים יותר מ-50% מפריטי החובה שבבקשה" : null;
    const raw = mode === "SINGLE" ? cov.score : cov.score * 0.7 + (priceScore ?? 0) * 0.3;
    const finalScore = knockout ? 0 : clampInt(raw, 0, 100);
    return {
      proposal_id: p.proposal.id,
      requirement_coverage_score: cov.score,
      compare_price_score: mode === "COMPARE" ? (priceScore ?? 0) : undefined,
      final_score: finalScore,
      knockout_triggered: knockout,
      knockout_reason_hint: hint,
      data_completeness: computeDataCompleteness(p.proposal),
      missing_mandatory_fee_items: cov.missing_mandatory_fee_items.map((i) => i.description),
      missing_mandatory_scope_items: cov.missing_mandatory_scope_items.map((i) => i.task_name),
      policy_red_flags: policyFlags,
      vendor_completeness_flags: vendorFlags,
    };
  });
}

// ---- PROMPTS ----
function allowedFieldsBlock() {
  return [
    "## AllowedFields",
    "- organization_evaluation_frame, project_metadata, rfp_requirements, proposals[], deterministic_scores[]",
    "- proposals: vendor_profile (name, registration_number, email, completeness), policy_red_flags, vendor_completeness_flags",
  ].join("\n");
}
function systemInstruction(mode) {
  const hebrew = [
    "- STRICT LANGUAGE: ALL narrative text MUST be in Hebrew. Use 'לא סופק' for missing values. Use 'אין' when list is empty (no missing items = full coverage). English ONLY for enums, proper nouns.",
    "- Do NOT use English field names in narrative. Use Hebrew: פריטי שכר חסרים, פריטי היקף חסרים. When value is ['אין'] = no items missing.",
    "- Evaluate THREE dimensions: Vendor identity, Organization constraints, RFP alignment.",
    "- Explain how missing data or policy violations impacted score.",
  ].join("\n");
  const base = [
    "You are a strict procurement evaluator. Output valid JSON only.",
    hebrew,
    "If value missing output: לא סופק. Keep locked fields from deterministic_scores unchanged.",
    "Include policy_red_flags and vendor_completeness_flags in flags.red_flags when present.",
    "",
    allowedFieldsBlock(),
  ].join("\n");
  if (mode === "SINGLE") return base + "\n\nSINGLE: no price_assessment, no market benchmarks.";
  return base + "\n\nCOMPARE: rank against organization_evaluation_frame first. Include price_assessment.";
}
function buildUserContent(args) {
  const { mode, project, rfp, proposals, deterministic, organizationPolicies, vendorCompanies } = args;
  const payload = proposals.map((p) => {
    const vc = vendorCompanies?.get(p.advisor.id) ?? null;
    const vn = p.proposal.supplier_name || p.advisor.company_name || vc?.name || "לא סופק";
    return {
      proposal_id: p.proposal.id,
      vendor_name: vn,
      company_name: p.advisor.company_name,
      vendor_profile: { name: vn, registration_number: vc?.registration_number ?? "לא סופק", email: vc?.email ?? "לא סופק", phone: vc?.phone ?? "לא סופק", completeness: (p.proposal.supplier_name || p.advisor.company_name) ? "מלא" : "חלקי" },
      price: p.proposal.price,
      currency: p.proposal.currency,
      timeline_days: p.proposal.timeline_days,
      scope_text: p.proposal.scope_text,
      extracted_text: p.proposal.extracted_text,
      terms: p.proposal.terms,
      conditions_json: p.proposal.conditions_json,
      fee_line_items: p.proposal.fee_line_items ?? [],
      selected_services: p.proposal.selected_services ?? [],
      milestone_adjustments: p.proposal.milestone_adjustments ?? [],
      consultant_request_notes: p.proposal.consultant_request_notes ?? p.proposal.services_notes ?? null,
      services_notes: p.proposal.services_notes ?? null,
    };
  });
  const orgFrame = organizationPolicies ? { default_currency: organizationPolicies.default_currency, allowed_currencies: organizationPolicies.allowed_currencies, payment_terms_policy: organizationPolicies.payment_terms_policy } : null;
  return JSON.stringify({
    evaluation_mode: mode,
    organization_evaluation_frame: orgFrame,
    project_metadata: { id: project.id, name: project.name, type: project.type, location: project.location, budget: project.budget, advisors_budget: project.advisors_budget, units: project.units, description: project.description, is_large_scale: project.is_large_scale, phase: project.phase },
    rfp_requirements: { rfp_id: rfp.rfp_id, rfp_invite_id: rfp.rfp_invite_id, advisor_type: rfp.advisor_type, request_title: rfp.request_title, request_content: rfp.request_content, service_details_text: rfp.service_details_text, payment_terms: rfp.payment_terms, fee_items: rfp.fee_items, service_scope_items: rfp.service_scope_items },
    proposals: payload,
    deterministic_scores: deterministic.map((d) => ({ ...d, missing_mandatory_fee_items: d.missing_mandatory_fee_items.length ? d.missing_mandatory_fee_items : ["אין"], missing_mandatory_scope_items: d.missing_mandatory_scope_items.length ? d.missing_mandatory_scope_items : ["אין"] })),
  }, null, 2);
}

// ---- MAIN ----
function getGoogleKey() {
  const k = Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GEMENI_API_KEY");
  if (!k) throw new Error("GOOGLE_API_KEY or GEMENI_API_KEY required");
  return k;
}
function getOpenAIKey() {
  const k = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_KEY");
  if (!k) throw new Error("OPENAI_API_KEY required");
  return k;
}
function getProvider() {
  const p = Deno.env.get("AI_PROVIDER")?.toLowerCase();
  if (p === "openai" || p === "google") return p;
  if (Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_KEY")) return "openai";
  return "google";
}
function stripFences(t) {
  let s = t.trim();
  if (s.startsWith("```json")) s = s.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  else if (s.startsWith("```")) s = s.replace(/^```\s*/, "").replace(/\s*```$/, "");
  return s.trim();
}
async function callOpenAI(system, user, key) {
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0, response_format: { type: "json_object" }, max_tokens: 8192 }),
  });
  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("No content in AI response");
  return JSON.parse(stripFences(text));
}
async function callGoogle(system, user, key) {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash-002";
  const v = model.includes("gemini-3") ? "v1beta" : "v1";
  const cfg = { temperature: 0, topK: 1, topP: 0.95, maxOutputTokens: 8192 };
  if (v === "v1beta") cfg.responseMimeType = "application/json";
  const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }], generationConfig: cfg }),
  });
  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content in AI response");
  return JSON.parse(stripFences(text));
}
function stableSort(scores) {
  return [...scores].sort((a, b) => (b.final_score_locked !== a.final_score_locked ? b.final_score_locked - a.final_score_locked : a.proposal_id.localeCompare(b.proposal_id)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { project_id, proposal_ids, force_reevaluate = false } = await req.json();
    if (!project_id) return new Response(JSON.stringify({ success: false, error: "project_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const provider = getProvider();
    const apiKey = provider === "openai" ? getOpenAIKey() : getGoogleKey();
    const { project, proposals, rfp, organizationAndPolicies, vendorCompanies } = await fetchEvaluationInputs(supabase, { project_id, proposal_ids });
    const mode = proposals.length === 1 ? "SINGLE" : "COMPARE";
    const preCheck = runPreCheck(proposals, organizationAndPolicies?.policies ?? null, vendorCompanies);

    if (!force_reevaluate) {
      const ids = proposals.map((p) => p.proposal.id);
      const { data: existing } = await supabase.from("proposals").select("id, evaluation_status, evaluation_result, evaluation_score, evaluation_rank").in("id", ids).eq("evaluation_status", "completed");
      if (existing?.length === proposals.length) {
        const ranked = existing.map((e) => ({ proposal_id: e.id, ...(e.evaluation_result || {}), final_score: e.evaluation_score, rank: e.evaluation_rank })).sort((a, b) => (a.rank || 0) - (b.rank || 0));
        return new Response(JSON.stringify({ success: true, cached: true, project_id, batch_summary: { total_proposals: proposals.length, evaluation_mode: mode, project_type_detected: project.is_large_scale ? "LARGE_SCALE" : "STANDARD", price_benchmark_used: null }, ranked_proposals: ranked }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    for (const p of proposals) {
      if ((p.proposal.extracted_text || "").trim().length < 50) {
        try {
          const ex = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-proposal-text`, {
            method: "POST",
            headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
            body: JSON.stringify({ proposal_id: p.proposal.id }),
          });
          if (ex.ok) {
            const r = await ex.json();
            p.proposal.extracted_text = r.extracted_text || p.proposal.scope_text || "";
          } else p.proposal.extracted_text = p.proposal.scope_text || "";
        } catch {
          p.proposal.extracted_text = p.proposal.scope_text || "";
        }
      }
    }

    const detBase = computeDeterministicScores(mode, rfp, proposals, { policyViolations: preCheck.all_violations, vendorCompanies });
    const sorted = stableSort(detBase.map((d) => ({ proposal_id: d.proposal_id, final_score_locked: d.final_score })));
    const detLocked = detBase.map((d) => {
      const rank = sorted.findIndex((x) => x.proposal_id === d.proposal_id) + 1;
      return { ...d, final_score_locked: d.final_score, rank_locked: rank, recommendation_level_locked: recommendationFromScore(d.final_score), data_completeness_locked: d.data_completeness, knockout_triggered_locked: d.knockout_triggered };
    });

    const userContent = buildUserContent({ mode, project, rfp, proposals, deterministic: detLocked, organizationPolicies: organizationAndPolicies?.policies ?? null, vendorCompanies });
    const sys = systemInstruction(mode);
    const start = Date.now();
    const raw = await Promise.race([
      provider === "openai" ? callOpenAI(sys, userContent, apiKey) : callGoogle(sys, userContent, apiKey),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Evaluation timeout")), EVALUATION_TIMEOUT_MS)),
    ]);
    const elapsed = Date.now() - start;

    const byId = new Map();
    if (raw?.ranked_proposals) for (const rp of raw.ranked_proposals) if (rp?.proposal_id) byId.set(rp.proposal_id, rp);
    const byProposal = new Map(proposals.map((p) => [p.proposal.id, p]));

    const ranked_proposals = sorted.map(({ proposal_id }) => {
      const base = detLocked.find((d) => d.proposal_id === proposal_id);
      const fromModel = byId.get(proposal_id) ?? {};
      const prop = byProposal.get(proposal_id);
      const vendor_name = prop?.proposal.supplier_name || prop?.advisor.company_name || "ספק לא ידוע";
      const policyFlags = base.policy_red_flags ?? [];
      const vendorFlags = base.vendor_completeness_flags ?? [];
      const modelFlags = Array.isArray(fromModel?.flags?.red_flags) ? fromModel.flags.red_flags : [];
      const red_flags = [...new Set([...policyFlags, ...vendorFlags, ...modelFlags])];
      const common = {
        proposal_id,
        vendor_name,
        final_score: base.final_score_locked,
        rank: base.rank_locked,
        data_completeness: base.data_completeness_locked,
        recommendation_level: base.recommendation_level_locked,
        flags: {
          red_flags,
          green_flags: Array.isArray(fromModel?.flags?.green_flags) ? fromModel.flags.green_flags : [],
          knockout_triggered: base.knockout_triggered_locked,
          knockout_reason: base.knockout_triggered_locked ? (fromModel?.flags?.knockout_reason?.trim() ? fromModel.flags.knockout_reason : base.knockout_reason_hint) : null,
        },
      };
      const ia = fromModel?.individual_analysis ?? {};
      const feeMiss = (base.missing_mandatory_fee_items ?? []).filter((x) => x !== "אין");
      const scopeMiss = (base.missing_mandatory_scope_items ?? []).filter((x) => x !== "אין");
      const missingReq = Array.isArray(ia.missing_requirements) ? ia.missing_requirements : [...feeMiss, ...scopeMiss];
      const def = "לא סופק";
      if (mode === "SINGLE") {
        return {
          ...common,
          individual_analysis: {
            requirements_alignment: ia.requirements_alignment ?? def,
            timeline_assessment: ia.timeline_assessment ?? def,
            experience_assessment: ia.experience_assessment ?? def,
            scope_quality: ia.scope_quality ?? def,
            fee_structure_assessment: ia.fee_structure_assessment,
            payment_terms_assessment: ia.payment_terms_assessment,
            strengths: ia.strengths ?? [],
            weaknesses: ia.weaknesses ?? [],
            missing_requirements: missingReq,
            extra_offerings: ia.extra_offerings ?? [],
          },
          comparative_notes: null,
        };
      }
      return {
        ...common,
        individual_analysis: {
          requirements_alignment: ia.requirements_alignment ?? def,
          price_assessment: ia.price_assessment ?? def,
          timeline_assessment: ia.timeline_assessment ?? def,
          experience_assessment: ia.experience_assessment ?? def,
          scope_quality: ia.scope_quality ?? def,
          fee_structure_assessment: ia.fee_structure_assessment,
          payment_terms_assessment: ia.payment_terms_assessment,
          strengths: ia.strengths ?? [],
          weaknesses: ia.weaknesses ?? [],
          missing_requirements: missingReq,
          extra_offerings: ia.extra_offerings ?? [],
        },
        comparative_notes: typeof fromModel?.comparative_notes === "string" ? fromModel.comparative_notes : null,
      };
    });

    const result = EvaluationResultSchema.parse({
      batch_summary: { total_proposals: proposals.length, evaluation_mode: mode, project_type_detected: project.is_large_scale ? "LARGE_SCALE" : "STANDARD", price_benchmark_used: mode === "SINGLE" ? null : null, market_context: raw?.batch_summary?.market_context },
      ranked_proposals,
    });

    const model = provider === "openai" ? (Deno.env.get("OPENAI_MODEL") || "gpt-4o") : (Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash-002");
    for (const rp of result.ranked_proposals) {
      await supabase.from("proposals").update({
        evaluation_result: rp,
        evaluation_score: rp.final_score,
        evaluation_rank: rp.rank,
        evaluation_status: "completed",
        evaluation_completed_at: new Date().toISOString(),
        evaluation_metadata: { model_used: model, provider: provider === "openai" ? "openai" : "google-ai-studio", temperature: 0, evaluation_time_ms: elapsed },
      }).eq("id", rp.proposal_id);
    }

    return new Response(JSON.stringify({ success: true, project_id, batch_summary: result.batch_summary, ranked_proposals: result.ranked_proposals, evaluation_metadata: { model_used: model, provider: provider === "openai" ? "openai" : "google-ai-studio", total_evaluation_time_ms: elapsed } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Evaluation failed";
    const status = (err as any)?.status ?? 500;
    let code = "EVALUATION_FAILED";
    if (msg.includes("timeout")) code = "TIMEOUT";
    else if (msg.includes("JSON")) code = "INVALID_JSON";
    else if (msg.includes("API key") || msg.includes("required")) code = "CONFIGURATION_ERROR";
    else if (msg.includes("AI API")) code = "AI_API_ERROR";
    return new Response(JSON.stringify({ success: false, error: msg, error_code: code }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

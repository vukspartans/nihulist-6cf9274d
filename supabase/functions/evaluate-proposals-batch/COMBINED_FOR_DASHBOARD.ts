// @ts-nocheck
/**
 * Supabase Dashboard deployment file (single-file bundle).
 *
 * Copy/paste the FULL contents of this file into:
 * Supabase Dashboard → Edge Functions → evaluate-proposals-batch → index.ts
 *
 * This file intentionally contains NO local imports ("./schema.ts", "./fetch.ts", ...),
 * because the Dashboard editor does not reliably support multi-file modules.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// -----------------------------
// schema.ts (inlined)
// -----------------------------

const EvaluationModeSchema = z.enum(["SINGLE", "COMPARE"]);
type EvaluationMode = z.infer<typeof EvaluationModeSchema>;

const ProjectTypeDetectedSchema = z.enum(["STANDARD", "LARGE_SCALE"]);

const RecommendationLevelSchema = z.enum([
  "Highly Recommended",
  "Recommended",
  "Review Required",
  "Not Recommended",
]);
type RecommendationLevel = z.infer<typeof RecommendationLevelSchema>;

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
  individual_analysis: IndividualAnalysisBaseSchema.extend({
    price_assessment: z.string(),
  }),
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

const EvaluationResultSingleSchema = z.object({
  batch_summary: BatchSummarySingleSchema,
  ranked_proposals: z.array(RankedProposalSingleSchema).min(1),
});

const EvaluationResultCompareSchema = z.object({
  batch_summary: BatchSummaryCompareSchema,
  ranked_proposals: z.array(RankedProposalCompareSchema).min(1),
});

const EvaluationResultSchema = z.union([EvaluationResultSingleSchema, EvaluationResultCompareSchema]);
type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

// -----------------------------
// fetch.ts (inlined)
// -----------------------------

type ProposalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "negotiation_requested"
  | "resubmitted";

type RfpInviteStatus =
  | "pending"
  | "sent"
  | "opened"
  | "in_progress"
  | "submitted"
  | "declined"
  | "expired";

interface ProjectRow {
  id: string;
  name: string | null;
  type: string | null;
  location: string | null;
  budget: number | null;
  advisors_budget: number | null;
  units: number | null;
  description: string | null;
  is_large_scale: boolean | null;
  phase: string | null;
}

interface RfpInviteRow {
  id: string;
  rfp_id: string;
  advisor_id: string | null;
  advisor_type: string | null;
  status: RfpInviteStatus;
  request_title: string | null;
  request_content: string | null;
  payment_terms: Record<string, unknown> | null;
  service_details_text: string | null;
}

interface RfpFeeItemRow {
  id: string;
  rfp_invite_id: string;
  description: string;
  unit: string;
  quantity: number;
  is_optional: boolean;
  charge_type: string | null;
  display_order: number | null;
}

interface RfpScopeItemRow {
  id: string;
  rfp_invite_id: string;
  task_name: string;
  is_optional: boolean;
  fee_category: string | null;
  display_order: number | null;
}

interface AdvisorRow {
  id: string;
  company_name: string | null;
  rating: number | null;
  expertise: string[] | null;
  certifications: string[] | null;
  founding_year: number | null;
}

interface ProposalRow {
  id: string;
  project_id: string;
  supplier_name: string;
  price: number | null;
  currency: string | null;
  timeline_days: number | null;
  scope_text: string | null;
  terms: string | null;
  conditions_json: Record<string, unknown> | null;
  extracted_text: string | null;
  files: unknown[] | null;
  advisor_id: string | null;
  rfp_invite_id: string | null;
  fee_line_items: unknown[] | null;
  selected_services: unknown[] | null;
  milestone_adjustments: unknown[] | null;
  consultant_request_notes: string | null;
  services_notes: string | null;
  status: ProposalStatus;
  submitted_at: string | null;
  current_version: number | null;
  advisors: AdvisorRow | AdvisorRow[] | null;
  rfp_invite: RfpInviteRow | RfpInviteRow[] | null;
}

interface EvaluationRfpRequirements {
  rfp_id: string;
  rfp_invite_id: string;
  advisor_type: string | null;
  request_title: string | null;
  request_content: string | null;
  payment_terms: Record<string, unknown> | null;
  service_details_text: string | null;
  fee_items: RfpFeeItemRow[];
  service_scope_items: RfpScopeItemRow[];
}

interface EvaluationProposalInput {
  proposal: ProposalRow;
  advisor: AdvisorRow;
  rfp_invite: RfpInviteRow;
}

function pickOne(value: any) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function compareForDedupe(a: ProposalRow, b: ProposalRow): number {
  const aVer = a.current_version ?? 0;
  const bVer = b.current_version ?? 0;
  if (aVer !== bVer) return bVer - aVer;

  const aTime = a.submitted_at ? Date.parse(a.submitted_at) : 0;
  const bTime = b.submitted_at ? Date.parse(b.submitted_at) : 0;
  if (aTime !== bTime) return bTime - aTime;

  return a.id.localeCompare(b.id);
}

async function fetchProject(supabase: any, project_id: string): Promise<ProjectRow> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, type, location, budget, advisors_budget, units, description, is_large_scale, phase")
    .eq("id", project_id)
    .single();

  if (error || !project) {
    throw Object.assign(new Error("Project not found"), { status: 404 });
  }

  return project as ProjectRow;
}

async function fetchEvaluationInputs(
  supabase: any,
  args: { project_id: string; proposal_ids?: string[] },
): Promise<{ project: ProjectRow; proposals: EvaluationProposalInput[]; rfp: EvaluationRfpRequirements }> {
  const project = await fetchProject(supabase, args.project_id);

  let proposalsQuery = supabase
    .from("proposals")
    .select(`
      id,
      project_id,
      supplier_name,
      price,
      currency,
      timeline_days,
      scope_text,
      terms,
      conditions_json,
      extracted_text,
      files,
      advisor_id,
      rfp_invite_id,
      fee_line_items,
      selected_services,
      milestone_adjustments,
      consultant_request_notes,
      services_notes,
      status,
      submitted_at,
      current_version,
      advisors!fk_proposals_advisor(
        id,
        company_name,
        rating,
        expertise,
        certifications,
        founding_year
      ),
      rfp_invite:rfp_invites!rfp_invite_id(
        id,
        rfp_id,
        advisor_id,
        advisor_type,
        status,
        request_title,
        request_content,
        payment_terms,
        service_details_text
      )
    `)
    .eq("project_id", args.project_id)
    .in("status", ["submitted", "resubmitted", "negotiation_requested"]);

  if (args.proposal_ids && args.proposal_ids.length > 0) {
    proposalsQuery = proposalsQuery.in("id", args.proposal_ids);
  }

  const { data: rawProposals, error: proposalsError } = await proposalsQuery;
  if (proposalsError) throw new Error(`Failed to fetch proposals: ${proposalsError.message}`);

  const proposals = (rawProposals ?? []) as ProposalRow[];
  if (proposals.length === 0) {
    throw Object.assign(new Error("No proposals found for evaluation"), { status: 400 });
  }

  // Require invite linkage + filter declined/expired invites
  const withInvite = proposals
    .map((p) => {
      const advisor = pickOne(p.advisors);
      const invite = pickOne(p.rfp_invite);
      return { proposal: p, advisor, invite };
    })
    .filter((x) => {
      if (!x.advisor || !x.invite) return false;
      if (x.invite.status === "declined" || x.invite.status === "expired") return false;
      return true;
    }) as Array<{ proposal: ProposalRow; advisor: AdvisorRow; invite: RfpInviteRow }>;

  if (withInvite.length === 0) {
    throw Object.assign(
      new Error("No eligible proposals found (missing invite linkage, or invites declined/expired)"),
      { status: 400 },
    );
  }

  // Safety de-dupe: keep latest active proposal per rfp_invite_id
  const byInvite = new Map<string, ProposalRow[]>();
  for (const x of withInvite) {
    const inviteId = x.proposal.rfp_invite_id;
    if (!inviteId) continue;
    const existing = byInvite.get(inviteId) ?? [];
    existing.push(x.proposal);
    byInvite.set(inviteId, existing);
  }

  const dedupedProposals: ProposalRow[] = [];
  for (const list of byInvite.values()) {
    list.sort(compareForDedupe);
    dedupedProposals.push(list[0]);
  }

  // Re-hydrate advisor/invite after de-dupe
  const dedupedInputs: EvaluationProposalInput[] = dedupedProposals.map((p) => {
    const advisor = pickOne(p.advisors);
    const invite = pickOne(p.rfp_invite);
    if (!advisor || !invite) {
      throw Object.assign(new Error("Proposal missing advisor or invite data"), { status: 500 });
    }
    return { proposal: p, advisor, rfp_invite: invite };
  });

  // Scope validation for COMPARE mode (2+ proposals)
  if (dedupedInputs.length >= 2) {
    const baseRfpId = dedupedInputs[0].rfp_invite.rfp_id;
    const baseAdvisorType = dedupedInputs[0].rfp_invite.advisor_type ?? null;

    for (const input of dedupedInputs) {
      if (input.rfp_invite.rfp_id !== baseRfpId) {
        throw Object.assign(new Error("All proposals must belong to the same RFP (rfp_id) to compare."), {
          status: 400,
        });
      }
      const t = input.rfp_invite.advisor_type ?? null;
      if (t !== baseAdvisorType) {
        throw Object.assign(new Error("All proposals must share the same advisor_type to compare."), { status: 400 });
      }
    }
  }

  // Fetch requirement rows from the FIRST invite (assumed shared across compared set)
  const baseInvite = dedupedInputs[0].rfp_invite;
  const inviteId = baseInvite.id;

  const [{ data: feeItems, error: feeError }, { data: scopeItems, error: scopeError }] = await Promise.all([
    supabase
      .from("rfp_request_fee_items")
      .select("id, rfp_invite_id, description, unit, quantity, is_optional, charge_type, display_order")
      .eq("rfp_invite_id", inviteId),
    supabase
      .from("rfp_service_scope_items")
      .select("id, rfp_invite_id, task_name, is_optional, fee_category, display_order")
      .eq("rfp_invite_id", inviteId),
  ]);

  if (feeError) throw new Error(`Failed to fetch RFP fee items: ${feeError.message}`);
  if (scopeError) throw new Error(`Failed to fetch RFP scope items: ${scopeError.message}`);

  const rfp: EvaluationRfpRequirements = {
    rfp_id: baseInvite.rfp_id,
    rfp_invite_id: baseInvite.id,
    advisor_type: baseInvite.advisor_type ?? null,
    request_title: baseInvite.request_title ?? null,
    request_content: baseInvite.request_content ?? null,
    payment_terms: (baseInvite.payment_terms ?? null) as Record<string, unknown> | null,
    service_details_text: baseInvite.service_details_text ?? null,
    fee_items: ((feeItems ?? []) as any[]).map((i) => ({
      id: i.id,
      rfp_invite_id: i.rfp_invite_id,
      description: i.description,
      unit: i.unit,
      quantity: Number(i.quantity ?? 1),
      is_optional: Boolean(i.is_optional ?? false),
      charge_type: (i.charge_type ?? null) as string | null,
      display_order: (i.display_order ?? null) as number | null,
    })),
    service_scope_items: ((scopeItems ?? []) as any[]).map((i) => ({
      id: i.id,
      rfp_invite_id: i.rfp_invite_id,
      task_name: i.task_name,
      is_optional: Boolean(i.is_optional ?? false),
      fee_category: (i.fee_category ?? null) as string | null,
      display_order: (i.display_order ?? null) as number | null,
    })),
  };

  return { project, proposals: dedupedInputs, rfp };
}

// -----------------------------
// scoring.ts (inlined)
// -----------------------------

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function toNumber(x: unknown): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : null;
}

interface RequirementCoverageResult {
  score: number; // 0-100
  total_mandatory: number;
  covered_mandatory: number;
  missing_mandatory_fee_items: RfpFeeItemRow[];
  missing_mandatory_scope_items: RfpScopeItemRow[];
}

function extractFeeLineItems(proposal: ProposalRow): Array<{ item_id?: string; description?: string }> {
  const raw = Array.isArray(proposal.fee_line_items) ? proposal.fee_line_items : [];
  return raw
    .map((x) => (typeof x === "object" && x ? (x as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((x) => ({
      item_id: typeof x!.item_id === "string" ? (x!.item_id as string) : typeof x!.id === "string" ? (x!.id as string) : undefined,
      description: typeof x!.description === "string" ? (x!.description as string) : typeof x!.name === "string" ? (x!.name as string) : undefined,
    }));
}

function extractSelectedServices(proposal: ProposalRow): string[] {
  const raw = Array.isArray(proposal.selected_services) ? proposal.selected_services : [];
  return raw.filter((x): x is string => typeof x === "string");
}

function computeRequirementCoverage(rfp: EvaluationRfpRequirements, proposalInput: EvaluationProposalInput): RequirementCoverageResult {
  const mandatoryFee = rfp.fee_items.filter((i) => !i.is_optional);
  const mandatoryScope = rfp.service_scope_items.filter((i) => !i.is_optional);

  const feeLineItems = extractFeeLineItems(proposalInput.proposal);
  const selectedServices = new Set(extractSelectedServices(proposalInput.proposal));

  const feeItemIds = new Set(feeLineItems.map((i) => i.item_id).filter(Boolean) as string[]);
  const feeItemDesc = new Set(feeLineItems.map((i) => i.description).filter(Boolean).map((d) => normalizeText(d!)));

  const missingFee: RfpFeeItemRow[] = [];
  for (const item of mandatoryFee) {
    const byId = item.id ? feeItemIds.has(item.id) : false;
    const byDesc = feeItemDesc.has(normalizeText(item.description));
    if (!byId && !byDesc) missingFee.push(item);
  }

  const missingScope: RfpScopeItemRow[] = [];
  for (const item of mandatoryScope) {
    if (!selectedServices.has(item.id)) missingScope.push(item);
  }

  const total = mandatoryFee.length + mandatoryScope.length;
  const missing = missingFee.length + missingScope.length;
  const covered = Math.max(0, total - missing);
  const score = total === 0 ? 100 : clampInt((covered / total) * 100, 0, 100);

  return {
    score,
    total_mandatory: total,
    covered_mandatory: covered,
    missing_mandatory_fee_items: missingFee,
    missing_mandatory_scope_items: missingScope,
  };
}

function computeComparePriceScores(proposals: EvaluationProposalInput[]): Map<string, number> {
  const prices = proposals
    .map((p) => ({ id: p.proposal.id, price: toNumber(p.proposal.price) }))
    .filter((x): x is { id: string; price: number } => typeof x.price === "number" && x.price > 0);

  const out = new Map<string, number>();
  if (prices.length === 0) return out;

  const min = Math.min(...prices.map((x) => x.price));
  const max = Math.max(...prices.map((x) => x.price));

  for (const { id, price } of prices) {
    const score = max === min ? 100 : clampInt(((max - price) / (max - min)) * 100, 0, 100);
    out.set(id, score);
  }

  return out;
}

function computeDataCompleteness(p: ProposalRow): number {
  const hasPrice = (toNumber(p.price) ?? 0) > 0;
  const hasTimeline = (toNumber(p.timeline_days) ?? 0) > 0;
  const scopeText = (p.extracted_text || p.scope_text || "").trim();
  const hasScope = scopeText.length > 50;
  const hasTerms = (p.terms || "").trim().length > 0;
  const hasFeeLineItems = Array.isArray(p.fee_line_items) && p.fee_line_items.length > 0;
  const hasSelectedServices = Array.isArray(p.selected_services) && p.selected_services.length > 0;
  const hasMilestones = Array.isArray(p.milestone_adjustments) && p.milestone_adjustments.length > 0;

  const score =
    (hasPrice ? 1 : 0) * 0.18 +
    (hasTimeline ? 1 : 0) * 0.08 +
    (hasScope ? 1 : 0) * 0.2 +
    (hasTerms ? 1 : 0) * 0.08 +
    (hasFeeLineItems ? 1 : 0) * 0.22 +
    (hasSelectedServices ? 1 : 0) * 0.12 +
    (hasMilestones ? 1 : 0) * 0.12;

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

function recommendationFromScore(score: number): RecommendationLevel {
  if (score >= 80) return "Highly Recommended";
  if (score >= 60) return "Recommended";
  if (score >= 40) return "Review Required";
  return "Not Recommended";
}

interface DeterministicProposalScore {
  proposal_id: string;
  requirement_coverage_score: number;
  compare_price_score?: number;
  final_score: number;
  knockout_triggered: boolean;
  knockout_reason_hint: string | null;
  data_completeness: number;
  missing_mandatory_fee_items: string[];
  missing_mandatory_scope_items: string[];
}

function computeDeterministicScores(
  mode: EvaluationMode,
  rfp: EvaluationRfpRequirements,
  proposals: EvaluationProposalInput[],
): DeterministicProposalScore[] {
  const priceScores = mode === "COMPARE" ? computeComparePriceScores(proposals) : new Map<string, number>();

  return proposals.map((p) => {
    const coverage = computeRequirementCoverage(rfp, p);
    const priceScore = priceScores.get(p.proposal.id);

    const missingRatio =
      coverage.total_mandatory === 0
        ? 0
        : (coverage.total_mandatory - coverage.covered_mandatory) / coverage.total_mandatory;

    const knockout = coverage.total_mandatory > 0 && missingRatio > 0.5;
    const finalScoreRaw = mode === "SINGLE" ? coverage.score : coverage.score * 0.7 + (priceScore ?? 0) * 0.3;
    const finalScore = knockout ? 0 : clampInt(finalScoreRaw, 0, 100);

    const missingFee = coverage.missing_mandatory_fee_items.map((i) => i.description);
    const missingScope = coverage.missing_mandatory_scope_items.map((i) => i.task_name);

    return {
      proposal_id: p.proposal.id,
      requirement_coverage_score: coverage.score,
      compare_price_score: mode === "COMPARE" ? priceScore ?? 0 : undefined,
      final_score: finalScore,
      knockout_triggered: knockout,
      knockout_reason_hint: knockout ? "חסרים יותר מ-50% מפריטי החובה שבבקשה" : null,
      data_completeness: computeDataCompleteness(p.proposal),
      missing_mandatory_fee_items: missingFee,
      missing_mandatory_scope_items: missingScope,
    };
  });
}

// -----------------------------
// prompts.ts (inlined; trimmed)
// -----------------------------

function allowedFieldsBlock(): string {
  return [
    "## AllowedFields (hard whitelist)",
    "- project_metadata: id, name, type, location, budget, advisors_budget, units, description, is_large_scale, phase",
    "- rfp_requirements: rfp_id, rfp_invite_id, advisor_type, request_title, request_content, service_details_text, payment_terms, fee_items[], service_scope_items[]",
    "- proposals[]: proposal_id, vendor_name, company_name, price, currency, timeline_days, scope_text, extracted_text, terms, conditions_json, fee_line_items[], selected_services[], milestone_adjustments[], consultant_request_notes, services_notes",
    "- deterministic_scores[]: proposal_id, requirement_coverage_score, compare_price_score (COMPARE only), final_score_locked, rank_locked, recommendation_level_locked, data_completeness_locked, knockout_triggered_locked, knockout_reason_hint, missing_mandatory_fee_items, missing_mandatory_scope_items",
  ].join("\n");
}

function systemInstruction(mode: EvaluationMode): string {
  if (mode === "SINGLE") {
    return [
      "You are a strict procurement evaluator.",
      "",
      "## CRITICAL RULES",
      "- Output MUST be valid JSON only (no markdown).",
      "- ALL human text MUST be in simple Hebrew, except enum values that must remain in English.",
      "- You MUST NOT invent or infer any missing value. If a value is null/empty/not present, output exactly: Not provided",
      "- SINGLE MODE: NO market benchmarks, NO industry averages, NO external comparisons, NO price commentary beyond what is in the proposal itself.",
      "- You MUST follow the response schema exactly for SINGLE mode: individual_analysis MUST NOT include price_assessment.",
      "- You MUST keep locked numeric fields EXACTLY as provided in deterministic_scores (final_score_locked, rank_locked, recommendation_level_locked, data_completeness_locked, knockout_triggered_locked). Do not change them.",
      "",
      allowedFieldsBlock(),
      "",
      "## Output schema (SINGLE)",
      "{",
      '  "batch_summary": { "total_proposals": 1, "project_type_detected": "STANDARD|LARGE_SCALE", "price_benchmark_used": null, "evaluation_mode": "SINGLE", "market_context"?: "string" },',
      '  "ranked_proposals": [',
      "    {",
      '      "proposal_id": "uuid",',
      '      "vendor_name": "string",',
      '      "final_score": 0-100,',
      '      "rank": 1,',
      '      "data_completeness": 0.0-1.0,',
      '      "recommendation_level": "Highly Recommended|Recommended|Review Required|Not Recommended",',
      '      "individual_analysis": {',
      '        "requirements_alignment": "string",',
      '        "timeline_assessment": "string",',
      '        "experience_assessment": "string",',
      '        "scope_quality": "string",',
      '        "fee_structure_assessment"?: "string",',
      '        "payment_terms_assessment"?: "string",',
      '        "strengths": ["string"],',
      '        "weaknesses": ["string"],',
      '        "missing_requirements": ["string"],',
      '        "extra_offerings": ["string"]',
      "      },",
      '      "flags": {',
      '        "red_flags": ["string"],',
      '        "green_flags": ["string"],',
      '        "knockout_triggered": true|false,',
      '        "knockout_reason": "string|null"',
      "      },",
      '      "comparative_notes": null',
      "    }",
      "  ]",
      "}",
    ].join("\n");
  }

  return [
    "You are a strict procurement evaluator.",
    "",
    "## CRITICAL RULES",
    "- Output MUST be valid JSON only (no markdown).",
    "- ALL human text MUST be in simple Hebrew, except enum values that must remain in English.",
    "- You MUST NOT invent or infer any missing value. If a value is null/empty/not present, output exactly: Not provided",
    "- COMPARE MODE: You MAY compare prices ONLY within the provided proposals set (no market benchmarks, no external standards).",
    "- You MUST follow the response schema exactly for COMPARE mode (includes price_assessment).",
    "- You MUST keep locked numeric fields EXACTLY as provided in deterministic_scores (final_score_locked, rank_locked, recommendation_level_locked, data_completeness_locked, knockout_triggered_locked). Do not change them.",
    "",
    allowedFieldsBlock(),
    "",
    "## Output schema (COMPARE)",
    "{",
    '  "batch_summary": { "total_proposals": int, "project_type_detected": "STANDARD|LARGE_SCALE", "price_benchmark_used": number|null, "evaluation_mode": "COMPARE", "market_context"?: "string" },',
    '  "ranked_proposals": [',
    "    {",
    '      "proposal_id": "uuid",',
    '      "vendor_name": "string",',
    '      "final_score": 0-100,',
    '      "rank": int,',
    '      "data_completeness": 0.0-1.0,',
    '      "recommendation_level": "Highly Recommended|Recommended|Review Required|Not Recommended",',
    '      "individual_analysis": {',
    '        "requirements_alignment": "string",',
    '        "price_assessment": "string (ONLY relative to this batch)",',
    '        "timeline_assessment": "string",',
    '        "experience_assessment": "string",',
    '        "scope_quality": "string",',
    '        "fee_structure_assessment"?: "string",',
    '        "payment_terms_assessment"?: "string",',
    '        "strengths": ["string"],',
    '        "weaknesses": ["string"],',
    '        "missing_requirements": ["string"],',
    '        "extra_offerings": ["string"]',
    "      },",
    '      "flags": {',
    '        "red_flags": ["string"],',
    '        "green_flags": ["string"],',
    '        "knockout_triggered": true|false,',
    '        "knockout_reason": "string|null"',
    "      },",
    '      "comparative_notes": "string|null"',
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

function buildUserContent(args: {
  mode: EvaluationMode;
  project: ProjectRow;
  rfp: EvaluationRfpRequirements;
  proposals: EvaluationProposalInput[];
  deterministic: Array<
    DeterministicProposalScore & {
      rank_locked: number;
      recommendation_level_locked: string;
      final_score_locked: number;
      data_completeness_locked: number;
      knockout_triggered_locked: boolean;
    }
  >;
}): string {
  const { mode, project, rfp, proposals, deterministic } = args;

  const proposalPayload = proposals.map((p) => ({
    proposal_id: p.proposal.id,
    vendor_name: p.proposal.supplier_name,
    company_name: p.advisor.company_name,
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
  }));

  const payload = {
    evaluation_mode: mode,
    project_metadata: {
      id: project.id,
      name: project.name,
      type: project.type,
      location: project.location,
      budget: project.budget,
      advisors_budget: project.advisors_budget,
      units: project.units,
      description: project.description,
      is_large_scale: project.is_large_scale,
      phase: project.phase,
    },
    rfp_requirements: {
      rfp_id: rfp.rfp_id,
      rfp_invite_id: rfp.rfp_invite_id,
      advisor_type: rfp.advisor_type,
      request_title: rfp.request_title,
      request_content: rfp.request_content,
      service_details_text: rfp.service_details_text,
      payment_terms: rfp.payment_terms,
      fee_items: rfp.fee_items,
      service_scope_items: rfp.service_scope_items,
    },
    proposals: proposalPayload,
    deterministic_scores: deterministic,
  };

  return JSON.stringify(payload, null, 2);
}

// -----------------------------
// index.ts (inlined)
// -----------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVALUATION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

interface EvaluateRequest {
  project_id: string;
  proposal_ids?: string[];
  force_reevaluate?: boolean;
}

function getGoogleAPIKey(): string {
  const apiKey = Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GEMENI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY or GEMENI_API_KEY environment variable is not set. Please configure Google AI Studio API key.",
    );
  }
  return apiKey;
}

function getOpenAIAPIKey(): string {
  const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set. Please configure OpenAI API key.");
  }
  return apiKey;
}

function getAIProvider(): "openai" | "google" {
  const explicitProvider = Deno.env.get("AI_PROVIDER")?.toLowerCase();
  if (explicitProvider === "openai" || explicitProvider === "google") {
    return explicitProvider as "openai" | "google";
  }

  const hasOpenAI = !!(Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_KEY"));
  const hasGoogle = !!(Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GEMENI_API_KEY"));

  if (hasOpenAI) return "openai";
  if (hasGoogle) return "google";
  return "google";
}

function stripFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

async function callOpenAI(system: string, user: string, apiKey: string): Promise<any> {
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o";
  const aiEndpoint = "https://api.openai.com/v1/chat/completions";

  const payload = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.0,
    response_format: { type: "json_object" },
    max_tokens: 8192,
  };

  const response = await fetch(aiEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  const jsonText = result.choices?.[0]?.message?.content;
  if (!jsonText) throw new Error("No content in AI response.");

  return JSON.parse(stripFences(jsonText));
}

async function callGoogleAIStudio(system: string, user: string, apiKey: string): Promise<any> {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash-002";
  const apiVersion = model.includes("gemini-3") ? "v1beta" : "v1";
  const aiEndpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;

  const generationConfig: any = {
    temperature: 0.0,
    topK: 1,
    topP: 0.95,
    maxOutputTokens: 8192,
  };
  if (apiVersion === "v1beta") {
    generationConfig.responseMimeType = "application/json";
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${system}\n\n${user}` }],
      },
    ],
    generationConfig,
  };

  const response = await fetch(aiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error("No content in AI response.");

  return JSON.parse(stripFences(jsonText));
}

function stableSortByScore(scores: Array<{ proposal_id: string; final_score_locked: number }>) {
  return [...scores].sort((a, b) => {
    if (b.final_score_locked !== a.final_score_locked) return b.final_score_locked - a.final_score_locked;
    return a.proposal_id.localeCompare(b.proposal_id);
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { project_id, proposal_ids, force_reevaluate = false }: EvaluateRequest = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ success: false, error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiProvider = getAIProvider();
    const apiKey = aiProvider === "openai" ? getOpenAIAPIKey() : getGoogleAPIKey();

    const { project, proposals, rfp } = await fetchEvaluationInputs(supabase, { project_id, proposal_ids });
    const mode: EvaluationMode = proposals.length === 1 ? "SINGLE" : "COMPARE";

    // Cache shortcut (best-effort): if all selected proposals already evaluated, return cached.
    if (!force_reevaluate) {
      const proposalIds = proposals.map((p) => p.proposal.id);
      const { data: existingEvaluations } = await supabase
        .from("proposals")
        .select("id, evaluation_status, evaluation_result, evaluation_score, evaluation_rank")
        .in("id", proposalIds)
        .eq("evaluation_status", "completed");

      if (existingEvaluations && existingEvaluations.length === proposals.length) {
        const rankedProposals = existingEvaluations
          .map((e) => ({
            proposal_id: e.id,
            ...(e.evaluation_result as any),
            final_score: e.evaluation_score,
            rank: e.evaluation_rank,
          }))
          .sort((a, b) => (a.rank || 0) - (b.rank || 0));

        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            project_id,
            batch_summary: {
              total_proposals: proposals.length,
              evaluation_mode: mode,
              project_type_detected: project.is_large_scale ? "LARGE_SCALE" : "STANDARD",
              price_benchmark_used: mode === "SINGLE" ? null : null,
              market_context: "Using cached evaluation results",
            },
            ranked_proposals: rankedProposals,
            evaluation_metadata: {
              cached: true,
              note:
                "These are cached results from a previous evaluation. Set force_reevaluate=true to re-run evaluation.",
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Ensure extracted_text exists (best-effort) for better explanations
    for (const p of proposals) {
      const text = (p.proposal.extracted_text || "").trim();
      if (text.length >= 50) continue;

      try {
        const extractResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-proposal-text`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ proposal_id: p.proposal.id }),
        });

        if (extractResponse.ok) {
          const extractResult = await extractResponse.json();
          p.proposal.extracted_text = extractResult.extracted_text || p.proposal.scope_text || "";
        } else {
          p.proposal.extracted_text = p.proposal.scope_text || "";
        }
      } catch {
        p.proposal.extracted_text = p.proposal.scope_text || "";
      }
    }

    const deterministicBase = computeDeterministicScores(mode, rfp, proposals);
    const rankedByScore = stableSortByScore(
      deterministicBase.map((d) => ({ proposal_id: d.proposal_id, final_score_locked: d.final_score })),
    );

    const deterministicLocked = deterministicBase.map((d) => {
      const rank = rankedByScore.findIndex((x) => x.proposal_id === d.proposal_id) + 1;
      const recommendation = recommendationFromScore(d.final_score);
      return {
        ...d,
        final_score_locked: d.final_score,
        rank_locked: rank,
        recommendation_level_locked: recommendation,
        data_completeness_locked: d.data_completeness,
        knockout_triggered_locked: d.knockout_triggered,
      };
    });

    const userContent = buildUserContent({
      mode,
      project,
      rfp,
      proposals,
      deterministic: deterministicLocked,
    });

    const sys = systemInstruction(mode);
    const startTime = Date.now();
    const raw = await Promise.race([
      aiProvider === "openai" ? callOpenAI(sys, userContent, apiKey) : callGoogleAIStudio(sys, userContent, apiKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Evaluation timeout")), EVALUATION_TIMEOUT_MS)
      ),
    ]);
    const evaluationTime = Date.now() - startTime;

    // Lock numeric fields + enforce deterministic ordering/ranks
    const byId = new Map<string, any>();
    if (raw?.ranked_proposals && Array.isArray(raw.ranked_proposals)) {
      for (const rp of raw.ranked_proposals) {
        if (rp && typeof rp.proposal_id === "string") byId.set(rp.proposal_id, rp);
      }
    }

    const proposalsById = new Map(proposals.map((p) => [p.proposal.id, p]));

    const ranked_proposals = rankedByScore.map(({ proposal_id }) => {
      const base = deterministicLocked.find((d) => d.proposal_id === proposal_id)!;
      const fromModel = byId.get(proposal_id) ?? {};
      const proposal = proposalsById.get(proposal_id);

      const vendor_name = proposal?.proposal.supplier_name || proposal?.advisor.company_name || "Unknown Vendor";

      const common = {
        proposal_id,
        vendor_name,
        final_score: base.final_score_locked,
        rank: base.rank_locked,
        data_completeness: base.data_completeness_locked,
        recommendation_level: base.recommendation_level_locked,
        flags: {
          red_flags: Array.isArray(fromModel?.flags?.red_flags) ? fromModel.flags.red_flags : [],
          green_flags: Array.isArray(fromModel?.flags?.green_flags) ? fromModel.flags.green_flags : [],
          knockout_triggered: base.knockout_triggered_locked,
          knockout_reason: base.knockout_triggered_locked
            ? (typeof fromModel?.flags?.knockout_reason === "string" && fromModel.flags.knockout_reason.trim()
              ? fromModel.flags.knockout_reason
              : base.knockout_reason_hint)
            : null,
        },
      };

      if (mode === "SINGLE") {
        return {
          ...common,
          individual_analysis: {
            requirements_alignment: fromModel?.individual_analysis?.requirements_alignment ?? "Not provided",
            timeline_assessment: fromModel?.individual_analysis?.timeline_assessment ?? "Not provided",
            experience_assessment: fromModel?.individual_analysis?.experience_assessment ?? "Not provided",
            scope_quality: fromModel?.individual_analysis?.scope_quality ?? "Not provided",
            fee_structure_assessment: fromModel?.individual_analysis?.fee_structure_assessment,
            payment_terms_assessment: fromModel?.individual_analysis?.payment_terms_assessment,
            strengths: Array.isArray(fromModel?.individual_analysis?.strengths)
              ? fromModel.individual_analysis.strengths
              : [],
            weaknesses: Array.isArray(fromModel?.individual_analysis?.weaknesses)
              ? fromModel.individual_analysis.weaknesses
              : [],
            missing_requirements: Array.isArray(fromModel?.individual_analysis?.missing_requirements)
              ? fromModel.individual_analysis.missing_requirements
              : [...base.missing_mandatory_fee_items, ...base.missing_mandatory_scope_items],
            extra_offerings: Array.isArray(fromModel?.individual_analysis?.extra_offerings)
              ? fromModel.individual_analysis.extra_offerings
              : [],
          },
          comparative_notes: null,
        };
      }

      return {
        ...common,
        individual_analysis: {
          requirements_alignment: fromModel?.individual_analysis?.requirements_alignment ?? "Not provided",
          price_assessment: fromModel?.individual_analysis?.price_assessment ?? "Not provided",
          timeline_assessment: fromModel?.individual_analysis?.timeline_assessment ?? "Not provided",
          experience_assessment: fromModel?.individual_analysis?.experience_assessment ?? "Not provided",
          scope_quality: fromModel?.individual_analysis?.scope_quality ?? "Not provided",
          fee_structure_assessment: fromModel?.individual_analysis?.fee_structure_assessment,
          payment_terms_assessment: fromModel?.individual_analysis?.payment_terms_assessment,
          strengths: Array.isArray(fromModel?.individual_analysis?.strengths) ? fromModel.individual_analysis.strengths : [],
          weaknesses: Array.isArray(fromModel?.individual_analysis?.weaknesses) ? fromModel.individual_analysis.weaknesses : [],
          missing_requirements: Array.isArray(fromModel?.individual_analysis?.missing_requirements)
            ? fromModel.individual_analysis.missing_requirements
            : [...base.missing_mandatory_fee_items, ...base.missing_mandatory_scope_items],
          extra_offerings: Array.isArray(fromModel?.individual_analysis?.extra_offerings) ? fromModel.individual_analysis.extra_offerings : [],
        },
        comparative_notes: typeof fromModel?.comparative_notes === "string" ? fromModel.comparative_notes : null,
      };
    });

    const evaluationResult: EvaluationResult = EvaluationResultSchema.parse({
      batch_summary: {
        total_proposals: proposals.length,
        evaluation_mode: mode,
        project_type_detected: project.is_large_scale ? "LARGE_SCALE" : "STANDARD",
        price_benchmark_used: mode === "SINGLE" ? null : null,
        market_context: typeof raw?.batch_summary?.market_context === "string" ? raw.batch_summary.market_context : undefined,
      },
      ranked_proposals,
    });

    // Persist per proposal
    const model = aiProvider === "openai" ? Deno.env.get("OPENAI_MODEL") || "gpt-4o" : Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash-002";

    for (const rp of evaluationResult.ranked_proposals) {
      await supabase
        .from("proposals")
        .update({
          evaluation_result: rp,
          evaluation_score: rp.final_score,
          evaluation_rank: rp.rank,
          evaluation_status: "completed",
          evaluation_completed_at: new Date().toISOString(),
          evaluation_metadata: {
            model_used: model,
            provider: aiProvider === "openai" ? "openai" : "google-ai-studio",
            temperature: 0.0,
            evaluation_time_ms: evaluationTime,
          },
        })
        .eq("id", rp.proposal_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        batch_summary: evaluationResult.batch_summary,
        ranked_proposals: evaluationResult.ranked_proposals,
        evaluation_metadata: {
          model_used: model,
          provider: aiProvider === "openai" ? "openai" : "google-ai-studio",
          temperature: 0.0,
          total_evaluation_time_ms: evaluationTime,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Evaluation failed";
    const status = (error as any)?.status ?? 500;

    let error_code = "EVALUATION_FAILED";
    if (msg.includes("timeout")) error_code = "TIMEOUT";
    else if (msg.includes("JSON")) error_code = "INVALID_JSON";
    else if (msg.includes("API key") || msg.includes("CONFIGURATION")) error_code = "CONFIGURATION_ERROR";
    else if (msg.includes("AI API error")) error_code = "AI_API_ERROR";
    else if (msg.includes("ZodError") || msg.includes("validation")) error_code = "VALIDATION_ERROR";

    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
        error_code,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});


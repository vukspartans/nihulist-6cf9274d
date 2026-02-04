import type { EvaluationMode, RecommendationLevel } from "./schema.ts";
import type { EvaluationProposalInput, EvaluationRfpRequirements, RfpFeeItemRow, RfpScopeItemRow, VendorCompanyRow } from "./fetch.ts";
import type { PolicyViolation, OrganizationPolicies } from "./precheck.ts";

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

export interface RequirementCoverageResult {
  score: number; // 0-100
  total_mandatory: number;
  covered_mandatory: number;
  missing_mandatory_fee_items: RfpFeeItemRow[];
  missing_mandatory_scope_items: RfpScopeItemRow[];
}

function extractFeeLineItems(proposal: EvaluationProposalInput["proposal"]): Array<{ item_id?: string; description?: string }> {
  const raw = Array.isArray(proposal.fee_line_items) ? proposal.fee_line_items : [];
  return raw
    .map((x) => (typeof x === "object" && x ? x as Record<string, unknown> : null))
    .filter((x): x is Record<string, unknown> => !!x)
    .map((x) => ({
      item_id: typeof x.item_id === "string" ? x.item_id : typeof x.id === "string" ? x.id : undefined,
      description: typeof x.description === "string" ? x.description : typeof x.name === "string" ? x.name : undefined,
    }));
}

function extractSelectedServices(proposal: EvaluationProposalInput["proposal"]): string[] {
  const raw = Array.isArray(proposal.selected_services) ? proposal.selected_services : [];
  return raw.filter((x): x is string => typeof x === "string");
}

export function computeRequirementCoverage(
  rfp: EvaluationRfpRequirements,
  proposalInput: EvaluationProposalInput,
): RequirementCoverageResult {
  const mandatoryFee = rfp.fee_items.filter((i) => !i.is_optional);
  const mandatoryScope = rfp.service_scope_items.filter((i) => !i.is_optional);

  const feeLineItems = extractFeeLineItems(proposalInput.proposal);
  const selectedServices = new Set(extractSelectedServices(proposalInput.proposal));

  const feeItemIds = new Set(feeLineItems.map((i) => i.item_id).filter(Boolean) as string[]);
  const feeItemDesc = new Set(
    feeLineItems.map((i) => i.description).filter(Boolean).map((d) => normalizeText(d!)),
  );

  const missingFee: RfpFeeItemRow[] = [];
  for (const item of mandatoryFee) {
    const byId = item.id ? feeItemIds.has(item.id) : false;
    const byDesc = feeItemDesc.has(normalizeText(item.description));
    if (!byId && !byDesc) missingFee.push(item);
  }

  const missingScope: RfpScopeItemRow[] = [];
  for (const item of mandatoryScope) {
    if (!selectedServices.has(item.id)) {
      missingScope.push(item);
    }
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

export function computeComparePriceScores(proposals: EvaluationProposalInput[]): Map<string, number> {
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

export function calculateYearsExperience(advisor: { founding_year: number | null }): number {
  if (!advisor.founding_year) return 0;
  return Math.max(0, new Date().getFullYear() - advisor.founding_year);
}

export function computeDataCompleteness(p: EvaluationProposalInput["proposal"]): number {
  const hasPrice = (toNumber(p.price) ?? 0) > 0;
  const hasTimeline = (toNumber(p.timeline_days) ?? 0) > 0;
  const scopeText = (p.extracted_text || p.scope_text || "").trim();
  const hasScope = scopeText.length > 50;
  const hasTerms = (p.terms || "").trim().length > 0;
  const hasFeeLineItems = Array.isArray(p.fee_line_items) && p.fee_line_items.length > 0;
  const hasSelectedServices = Array.isArray(p.selected_services) && p.selected_services.length > 0;
  const hasMilestones = Array.isArray(p.milestone_adjustments) && p.milestone_adjustments.length > 0;

  const score = (
    (hasPrice ? 1 : 0) * 0.18 +
    (hasTimeline ? 1 : 0) * 0.08 +
    (hasScope ? 1 : 0) * 0.20 +
    (hasTerms ? 1 : 0) * 0.08 +
    (hasFeeLineItems ? 1 : 0) * 0.22 +
    (hasSelectedServices ? 1 : 0) * 0.12 +
    (hasMilestones ? 1 : 0) * 0.12
  );

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

export function recommendationFromScore(score: number): RecommendationLevel {
  if (score >= 80) return "Highly Recommended";
  if (score >= 60) return "Recommended";
  if (score >= 40) return "Review Required";
  return "Not Recommended";
}

export interface DeterministicProposalScore {
  proposal_id: string;
  requirement_coverage_score: number;
  compare_price_score?: number;
  final_score: number;
  knockout_triggered: boolean;
  knockout_reason_hint: string | null;
  data_completeness: number;
  missing_mandatory_fee_items: string[];
  missing_mandatory_scope_items: string[];
  policy_red_flags: string[];
  vendor_completeness_flags: string[];
}

function getPolicyRedFlags(proposalId: string, violations: PolicyViolation[]): string[] {
  return violations.filter((v) => v.proposal_id === proposalId).map((v) => v.message_he);
}

function getVendorCompletenessFlags(
  input: EvaluationProposalInput,
  vendorCompany: VendorCompanyRow | null,
): string[] {
  const flags: string[] = [];
  const vendorName = input.proposal.supplier_name?.trim() || input.advisor.company_name?.trim() || vendorCompany?.name?.trim();
  if (!vendorName) flags.push("פרופיל ספק לא מלא: חסר שם ספק/חברה");
  return flags;
}

export function computeDeterministicScores(
  mode: EvaluationMode,
  rfp: EvaluationRfpRequirements,
  proposals: EvaluationProposalInput[],
  options?: {
    policyViolations?: PolicyViolation[];
    vendorCompanies?: Map<string, VendorCompanyRow>;
  },
): DeterministicProposalScore[] {
  const priceScores = mode === "COMPARE" ? computeComparePriceScores(proposals) : new Map<string, number>();
  const policyViolations = options?.policyViolations ?? [];
  const vendorCompanies = options?.vendorCompanies ?? new Map();

  return proposals.map((p) => {
    const coverage = computeRequirementCoverage(rfp, p);
    const priceScore = priceScores.get(p.proposal.id);
    const policyFlags = getPolicyRedFlags(p.proposal.id, policyViolations);
    const vendorFlags = getVendorCompletenessFlags(p, vendorCompanies.get(p.advisor.id) ?? null);

    const missingRatio =
      coverage.total_mandatory === 0 ? 0 : (coverage.total_mandatory - coverage.covered_mandatory) / coverage.total_mandatory;

    const policyKnockout = policyViolations.some(
      (v) => v.proposal_id === p.proposal.id && (v.type === "CURRENCY" || v.type === "PAYMENT_TERMS"),
    );
    const coverageKnockout = coverage.total_mandatory > 0 && missingRatio > 0.5;
    const knockout = policyKnockout || coverageKnockout;

    const knockoutHint = policyKnockout
      ? policyFlags[0] ?? "הפרת מדיניות ארגונית"
      : coverageKnockout
        ? "חסרים יותר מ-50% מפריטי החובה שבבקשה"
        : null;

    const finalScoreRaw =
      mode === "SINGLE"
        ? coverage.score
        : (coverage.score * 0.7) + ((priceScore ?? 0) * 0.3);
    const finalScore = knockout ? 0 : clampInt(finalScoreRaw, 0, 100);

    const missingFee = coverage.missing_mandatory_fee_items.map((i) => i.description);
    const missingScope = coverage.missing_mandatory_scope_items.map((i) => i.task_name);

    return {
      proposal_id: p.proposal.id,
      requirement_coverage_score: coverage.score,
      compare_price_score: mode === "COMPARE" ? (priceScore ?? 0) : undefined,
      final_score: finalScore,
      knockout_triggered: knockout,
      knockout_reason_hint: knockoutHint,
      data_completeness: computeDataCompleteness(p.proposal),
      missing_mandatory_fee_items: missingFee,
      missing_mandatory_scope_items: missingScope,
      policy_red_flags: policyFlags,
      vendor_completeness_flags: vendorFlags,
    };
  });
}


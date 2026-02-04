import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import type { EvaluationProposalInput } from "./fetch.ts";

export interface OrganizationPolicies {
  organization_id: string;
  default_currency: string;
  allowed_currencies: string[];
  payment_terms_policy: Record<string, unknown>;
  procurement_rules: Record<string, unknown>;
  required_contract_clauses: string[];
}

export interface PolicyViolation {
  proposal_id: string;
  type: "CURRENCY" | "PAYMENT_TERMS" | "PROCUREMENT" | "VENDOR_INCOMPLETE";
  message_he: string;
  message_en: string;
}

export interface PreCheckResult {
  passed: boolean;
  rejected_proposal_ids: string[];
  violations_by_proposal: Map<string, PolicyViolation[]>;
  all_violations: PolicyViolation[];
}

function toNumber(x: unknown): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : null;
}

function normalizeCurrency(c: string | null | undefined): string {
  if (!c || typeof c !== "string") return "";
  return c.trim().toUpperCase();
}

export function checkCurrencyViolation(
  proposal: EvaluationProposalInput["proposal"],
  policies: OrganizationPolicies | null,
): PolicyViolation | null {
  if (!policies?.allowed_currencies?.length) return null;
  const proposalCurrency = normalizeCurrency(proposal.currency);
  if (!proposalCurrency) return null; // no currency in proposal - let AI flag
  const allowed = new Set(policies.allowed_currencies.map((x) => x.toUpperCase()));
  if (allowed.has(proposalCurrency)) return null;
  return {
    proposal_id: proposal.id,
    type: "CURRENCY",
    message_he: `מטבע ההצעה (${proposalCurrency}) אינו מותר. המטבעות המורשים: ${policies.allowed_currencies.join(", ")}`,
    message_en: `Proposal currency (${proposalCurrency}) not allowed. Allowed: ${policies.allowed_currencies.join(", ")}`,
  };
}

export function checkPaymentTermsViolation(
  proposal: EvaluationProposalInput["proposal"],
  policies: OrganizationPolicies | null,
): PolicyViolation | null {
  if (!policies?.payment_terms_policy || typeof policies.payment_terms_policy !== "object") return null;
  const policy = policies.payment_terms_policy as Record<string, unknown>;
  const maxUpfrontPercent = typeof policy.max_upfront_percent === "number" ? policy.max_upfront_percent : null;
  if (maxUpfrontPercent == null) return null;

  // Check milestone_adjustments for upfront % - simple heuristic
  const milestones = Array.isArray(proposal.milestone_adjustments) ? proposal.milestone_adjustments : [];
  let totalUpfront = 0;
  for (const m of milestones) {
    if (typeof m === "object" && m && "percentage" in m) {
      const pct = toNumber((m as Record<string, unknown>).percentage);
      const when = String((m as Record<string, unknown>).when ?? "").toLowerCase();
      if (pct != null && (when.includes("התחלה") || when.includes("מקדמה") || when.includes("upfront") || when.includes("תחילת"))) {
        totalUpfront += pct;
      }
    }
  }
  if (totalUpfront > maxUpfrontPercent) {
    return {
      proposal_id: proposal.id,
      type: "PAYMENT_TERMS",
      message_he: `תנאי התשלום מפרים את מדיניות הארגון: מקדמה ${totalUpfront}% מעל המקסימום המותר (${maxUpfrontPercent}%)`,
      message_en: `Payment terms violate organization policy: upfront ${totalUpfront}% exceeds max allowed (${maxUpfrontPercent}%)`,
    };
  }
  return null;
}

export function checkVendorCompleteness(
  input: EvaluationProposalInput,
  vendorCompany: { name: string | null; registration_number: string | null; email: string | null } | null,
): PolicyViolation | null {
  const advisor = input.advisor;
  const proposal = input.proposal;
  const vendorName = proposal.supplier_name?.trim() || advisor.company_name?.trim() || vendorCompany?.name?.trim();
  if (!vendorName) {
    return {
      proposal_id: proposal.id,
      type: "VENDOR_INCOMPLETE",
      message_he: "פרופיל ספק לא מלא: חסר שם ספק/חברה",
      message_en: "Vendor profile incomplete: missing vendor/company name",
    };
  }
  // Optional: require registration_number for certain orgs - skip for now to avoid over-rejection
  return null;
}

export function runPreCheck(
  inputs: EvaluationProposalInput[],
  policies: OrganizationPolicies | null,
  vendorCompanies: Map<string, { name: string | null; registration_number: string | null; email: string | null }>,
): PreCheckResult {
  const violations_by_proposal = new Map<string, PolicyViolation[]>();
  const all_violations: PolicyViolation[] = [];
  const rejected_proposal_ids: string[] = [];

  for (const input of inputs) {
    const violations: PolicyViolation[] = [];
    const proposal = input.proposal;
    const vendorCompany = vendorCompanies.get(input.advisor.id) ?? null;

    const currencyV = checkCurrencyViolation(proposal, policies);
    if (currencyV) violations.push(currencyV);

    const paymentV = checkPaymentTermsViolation(proposal, policies);
    if (paymentV) violations.push(paymentV);

    const vendorV = checkVendorCompleteness(input, vendorCompany);
    if (vendorV) violations.push(vendorV);

    for (const v of violations) {
      all_violations.push(v);
      const existing = violations_by_proposal.get(proposal.id) ?? [];
      existing.push(v);
      violations_by_proposal.set(proposal.id, existing);
      // Hard reject only for CURRENCY and PAYMENT_TERMS
      if ((v.type === "CURRENCY" || v.type === "PAYMENT_TERMS") && !rejected_proposal_ids.includes(proposal.id)) {
        rejected_proposal_ids.push(proposal.id);
      }
    }
  }

  return {
    passed: rejected_proposal_ids.length === 0,
    rejected_proposal_ids,
    violations_by_proposal,
    all_violations,
  };
}

export async function fetchOrganizationPolicies(
  supabase: SupabaseClient,
  owner_id: string,
): Promise<{ organization_id: string; policies: OrganizationPolicies } | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", owner_id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) return null;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, default_currency, allowed_currencies, payment_terms_policy, procurement_rules, required_contract_clauses")
    .eq("id", profile.organization_id)
    .maybeSingle();

  if (companyError || !company) return null;

  const allowedCurrencies = Array.isArray(company.allowed_currencies) ? company.allowed_currencies : 
    (company.default_currency ? [company.default_currency] : ["ILS"]);
  const requiredClauses = Array.isArray(company.required_contract_clauses) ? company.required_contract_clauses : [];

  return {
    organization_id: company.id,
    policies: {
      organization_id: company.id,
      default_currency: company.default_currency || "ILS",
      allowed_currencies: allowedCurrencies,
      payment_terms_policy: (company.payment_terms_policy as Record<string, unknown>) ?? {},
      procurement_rules: (company.procurement_rules as Record<string, unknown>) ?? {},
      required_contract_clauses: requiredClauses,
    },
  };
}

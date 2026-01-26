import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

export type ProposalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "negotiation_requested"
  | "resubmitted";

export type RfpInviteStatus =
  | "pending"
  | "sent"
  | "opened"
  | "in_progress"
  | "submitted"
  | "declined"
  | "expired";

export interface ProjectRow {
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

export interface RfpInviteRow {
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

export interface RfpFeeItemRow {
  id: string;
  rfp_invite_id: string;
  description: string;
  unit: string;
  quantity: number;
  is_optional: boolean;
  charge_type: string | null;
  display_order: number | null;
}

export interface RfpScopeItemRow {
  id: string;
  rfp_invite_id: string;
  task_name: string;
  is_optional: boolean;
  fee_category: string | null;
  display_order: number | null;
}

export interface AdvisorRow {
  id: string;
  company_name: string | null;
  rating: number | null;
  expertise: string[] | null;
  certifications: string[] | null;
  founding_year: number | null;
}

export interface ProposalRow {
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

export interface EvaluationRfpRequirements {
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

export interface EvaluationProposalInput {
  proposal: ProposalRow;
  advisor: AdvisorRow;
  rfp_invite: RfpInviteRow;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
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

export async function fetchProject(
  supabase: SupabaseClient,
  project_id: string,
): Promise<ProjectRow> {
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

export async function fetchEvaluationInputs(
  supabase: SupabaseClient,
  args: { project_id: string; proposal_ids?: string[] },
): Promise<{
  project: ProjectRow;
  proposals: EvaluationProposalInput[];
  rfp: EvaluationRfpRequirements;
}> {
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

  if (proposalsError) {
    throw new Error(`Failed to fetch proposals: ${proposalsError.message}`);
  }

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
    .filter((x): x is { proposal: ProposalRow; advisor: AdvisorRow; invite: RfpInviteRow } => {
      if (!x.advisor || !x.invite) return false;
      if (x.invite.status === "declined" || x.invite.status === "expired") return false;
      return true;
    });

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
        throw Object.assign(
          new Error("All proposals must belong to the same RFP (rfp_id) to compare."),
          { status: 400 },
        );
      }
      const t = input.rfp_invite.advisor_type ?? null;
      if (t !== baseAdvisorType) {
        throw Object.assign(
          new Error("All proposals must share the same advisor_type to compare."),
          { status: 400 },
        );
      }
    }
  }

  // Fetch requirement rows from the FIRST invite (assumed shared across compared set)
  const baseInvite = dedupedInputs[0].rfp_invite;
  const inviteId = baseInvite.id;

  const [{ data: feeItems, error: feeError }, { data: scopeItems, error: scopeError }] =
    await Promise.all([
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


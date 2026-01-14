import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_TIMES } from '@/utils/constants';
import type { NegotiationStep } from '@/components/NegotiationStepsTimeline';

export interface AdvisorTypeInvite {
  inviteId: string;
  rfpId: string;
  rfpSentAt: string;
  advisorId: string;
  advisorName: string;
  status: 'pending' | 'sent' | 'opened' | 'in_progress' | 'submitted' | 'declined' | 'expired';
  proposalId?: string;
  proposalStatus?: string;
  proposalSubmittedAt?: string;
  declineReason?: string;
  email: string;
  deadlineAt?: string;
  createdAt: string;
  negotiationSteps?: NegotiationStep[];
}

export interface AdvisorTypeGroup {
  advisorType: string;
  invites: AdvisorTypeInvite[];
  totalInvites: number;
  proposalsCount: number;
}

export const useRFPInvitesWithDetails = (projectId: string) => {
  return useQuery({
    queryKey: ['rfp-invites-by-advisor-type', projectId],
    queryFn: async (): Promise<AdvisorTypeGroup[]> => {
      console.log('[useRFPInvitesWithDetails] Fetching RFPs for project:', projectId);

      // Fetch RFPs with invites
      const { data: rfps, error: rfpsError } = await supabase
        .from('rfps')
        .select(`
          id,
          subject,
          sent_at,
          rfp_invites!rfp_invites_rfp_id_fkey (
            id,
            advisor_id,
            advisor_type,
            status,
            decline_reason,
            email,
            deadline_at,
            created_at,
            advisors!rfp_invites_advisor_id_fkey (
              id,
              company_name,
              expertise
            )
          )
        `)
        .eq('project_id', projectId)
        .order('sent_at', { ascending: false });

      if (rfpsError) {
        console.error('[useRFPInvitesWithDetails] Error fetching RFPs:', rfpsError);
        throw rfpsError;
      }

      console.log('[useRFPInvitesWithDetails] Fetched RFPs:', rfps?.length || 0);

      if (!rfps || rfps.length === 0) return [];

      // Fetch proposals with rfp_invite_id for accurate linking
      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, advisor_id, rfp_invite_id, submitted_at, status')
        .eq('project_id', projectId)
        .not('status', 'in', '("withdrawn","rejected")');

      // Fetch negotiation sessions for this project
      const { data: negotiations } = await supabase
        .from('negotiation_sessions')
        .select('id, proposal_id, status, target_total, created_at, responded_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      // Get all proposal IDs to fetch versions
      const proposalIds = (proposals || []).map((p: any) => p.id);

      // Fetch proposal versions
      const { data: versions } = await supabase
        .from('proposal_versions')
        .select('id, proposal_id, version_number, price, created_at, change_reason')
        .in('proposal_id', proposalIds.length > 0 ? proposalIds : ['00000000-0000-0000-0000-000000000000'])
        .order('version_number', { ascending: true });

      // Create maps for quick lookup
      const proposalByInviteId = new Map<string, { id: string; submitted_at: string; status: string }>();
      const legacyProposals: Array<{ id: string; advisor_id: string; submitted_at: string; status: string }> = [];
      
      (proposals || []).forEach((p: any) => {
        if (p.rfp_invite_id) {
          proposalByInviteId.set(p.rfp_invite_id, { id: p.id, submitted_at: p.submitted_at, status: p.status });
        } else {
          legacyProposals.push({ id: p.id, advisor_id: p.advisor_id, submitted_at: p.submitted_at, status: p.status });
        }
      });

      // Create negotiation map keyed by proposal_id
      const negotiationsByProposalId = new Map<string, any[]>();
      (negotiations || []).forEach((n: any) => {
        const existing = negotiationsByProposalId.get(n.proposal_id) || [];
        existing.push(n);
        negotiationsByProposalId.set(n.proposal_id, existing);
      });

      // Create versions map keyed by proposal_id
      const versionsByProposalId = new Map<string, any[]>();
      (versions || []).forEach((v: any) => {
        const existing = versionsByProposalId.get(v.proposal_id) || [];
        existing.push(v);
        versionsByProposalId.set(v.proposal_id, existing);
      });

      // Helper to build negotiation steps for a proposal
      const buildNegotiationSteps = (
        proposalId: string,
        proposalSubmittedAt: string,
        proposalStatus: string
      ): NegotiationStep[] => {
        const steps: NegotiationStep[] = [];
        const propNegotiations = negotiationsByProposalId.get(proposalId) || [];
        const propVersions = versionsByProposalId.get(proposalId) || [];

        // Step 1: Original offer
        steps.push({
          date: proposalSubmittedAt,
          label: 'הצעה מקורית',
          type: 'original_offer',
          version: 1,
          status: propNegotiations.length === 0 ? proposalStatus : undefined,
          viewData: { type: 'proposal', id: proposalId },
        });

        // Build interleaved steps from negotiations and versions
        // Sort negotiations by created_at
        const sortedNegotiations = [...propNegotiations].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Sort versions by version_number (skip V1 which is original)
        const sortedVersions = [...propVersions]
          .filter(v => v.version_number > 1)
          .sort((a, b) => a.version_number - b.version_number);

        let negotiationIndex = 0;
        let versionIndex = 0;

        // Interleave: typically change_request -> updated_offer pattern
        while (negotiationIndex < sortedNegotiations.length || versionIndex < sortedVersions.length) {
          // Add change request
          if (negotiationIndex < sortedNegotiations.length) {
            const neg = sortedNegotiations[negotiationIndex];
            const requestNumber = negotiationIndex + 1;
            steps.push({
              date: neg.created_at,
              label: requestNumber === 1 ? 'בקשה לשינויים' : `בקשה לשינויים ${requestNumber}`,
              type: 'change_request',
              viewData: { type: 'negotiation_session', id: neg.id },
            });
            negotiationIndex++;
          }

          // Add updated offer (version response)
          if (versionIndex < sortedVersions.length) {
            const ver = sortedVersions[versionIndex];
            const isLast = versionIndex === sortedVersions.length - 1 && negotiationIndex >= sortedNegotiations.length;
            steps.push({
              date: ver.created_at,
              label: `הצעה V${ver.version_number}`,
              type: 'updated_offer',
              version: ver.version_number,
              status: isLast ? proposalStatus : undefined,
              viewData: { type: 'version', id: ver.id },
            });
            versionIndex++;
          }
        }

        return steps;
      };

      // Group by advisor type
      const groupedByType = new Map<string, AdvisorTypeGroup>();

      rfps.forEach(rfp => {
        const invites = (rfp.rfp_invites as any[]) || [];
        
        invites.forEach(invite => {
          const advisor = invite.advisors;
          const advisorType = invite.advisor_type || advisor?.expertise?.[0] || 'לא מוגדר';
          
          // Look up proposal by invite ID first
          const matchedProposal = proposalByInviteId.get(invite.id);
          let proposalId: string | undefined = matchedProposal?.id;
          let proposalStatus: string | undefined = matchedProposal?.status;
          let proposalSubmittedAt: string | undefined = matchedProposal?.submitted_at;
          
          // Fallback for legacy proposals
          if (!proposalId) {
            const legacyMatch = legacyProposals.find(lp => 
              lp.advisor_id === invite.advisor_id &&
              new Date(lp.submitted_at) >= new Date(invite.created_at)
            );
            if (legacyMatch) {
              proposalId = legacyMatch.id;
              proposalStatus = legacyMatch.status;
              proposalSubmittedAt = legacyMatch.submitted_at;
            }
          }

          // Build negotiation steps if proposal exists
          let negotiationSteps: NegotiationStep[] | undefined;
          if (proposalId && proposalSubmittedAt) {
            negotiationSteps = buildNegotiationSteps(proposalId, proposalSubmittedAt, proposalStatus || 'submitted');
          }

          // Initialize group if doesn't exist
          if (!groupedByType.has(advisorType)) {
            groupedByType.set(advisorType, {
              advisorType,
              invites: [],
              totalInvites: 0,
              proposalsCount: 0,
            });
          }

          const group = groupedByType.get(advisorType)!;
          
          group.invites.push({
            inviteId: invite.id,
            rfpId: rfp.id,
            rfpSentAt: rfp.sent_at,
            advisorId: invite.advisor_id,
            advisorName: advisor?.company_name || 'לא ידוע',
            status: invite.status,
            proposalId,
            proposalStatus,
            proposalSubmittedAt,
            declineReason: invite.decline_reason,
            email: invite.email,
            deadlineAt: invite.deadline_at,
            createdAt: invite.created_at,
            negotiationSteps,
          });

          group.totalInvites++;
          if (proposalId) group.proposalsCount++;
        });
      });

      // Sort invites within each group by date (newest first)
      groupedByType.forEach(group => {
        group.invites.sort((a, b) => 
          new Date(b.rfpSentAt).getTime() - new Date(a.rfpSentAt).getTime()
        );
      });

      // Return as array sorted by advisor type (Hebrew)
      const result = Array.from(groupedByType.values())
        .sort((a, b) => a.advisorType.localeCompare(b.advisorType, 'he'));

      console.log('[useRFPInvitesWithDetails] Grouped by advisor type:', result.length, 'groups');
      
      return result;
    },
    enabled: !!projectId,
    ...CACHE_TIMES.REALTIME,
  });
};

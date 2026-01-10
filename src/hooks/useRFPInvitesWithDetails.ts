import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_TIMES } from '@/utils/constants';

export interface AdvisorTypeInvite {
  inviteId: string;
  rfpId: string;
  rfpSentAt: string;
  advisorId: string;
  advisorName: string;
  status: 'pending' | 'sent' | 'opened' | 'in_progress' | 'submitted' | 'declined' | 'expired';
  proposalId?: string;
  declineReason?: string;
  email: string;
  deadlineAt?: string;
  createdAt: string;
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
        .select('id, advisor_id, rfp_invite_id, submitted_at')
        .eq('project_id', projectId)
        .not('status', 'in', '("withdrawn","rejected")');

      // Create proposal map keyed by rfp_invite_id (primary) with fallback temporal matching
      const proposalByInviteId = new Map<string, { id: string; submitted_at: string }>();
      const legacyProposals: Array<{ id: string; advisor_id: string; submitted_at: string }> = [];
      
      (proposals || []).forEach((p: any) => {
        if (p.rfp_invite_id) {
          proposalByInviteId.set(p.rfp_invite_id, { id: p.id, submitted_at: p.submitted_at });
        } else {
          legacyProposals.push({ id: p.id, advisor_id: p.advisor_id, submitted_at: p.submitted_at });
        }
      });

      // Group by advisor type instead of RFP
      const groupedByType = new Map<string, AdvisorTypeGroup>();

      rfps.forEach(rfp => {
        const invites = (rfp.rfp_invites as any[]) || [];
        
        invites.forEach(invite => {
          const advisor = invite.advisors;
          const advisorType = invite.advisor_type || advisor?.expertise?.[0] || 'לא מוגדר';
          
          // Look up proposal by invite ID first
          let proposalId: string | undefined = proposalByInviteId.get(invite.id)?.id;
          
          // Fallback for legacy proposals
          if (!proposalId) {
            const legacyMatch = legacyProposals.find(lp => 
              lp.advisor_id === invite.advisor_id &&
              new Date(lp.submitted_at) >= new Date(invite.created_at)
            );
            if (legacyMatch) {
              proposalId = legacyMatch.id;
            }
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
            declineReason: invite.decline_reason,
            email: invite.email,
            deadlineAt: invite.deadline_at,
            createdAt: invite.created_at,
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

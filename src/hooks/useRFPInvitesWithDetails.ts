import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_TIMES } from '@/utils/constants';

export interface AdvisorInviteDetail {
  inviteId: string;
  advisorId: string;
  advisorName: string;
  advisorType: string;
  status: 'pending' | 'sent' | 'opened' | 'in_progress' | 'submitted' | 'declined' | 'expired';
  proposalId?: string | undefined;
  declineReason?: string;
  email: string;
  deadlineAt?: string;
  createdAt: string;
}

export interface RFPWithInvites {
  rfpId: string;
  subject: string;
  sentAt: string;
  totalInvites: number;
  advisorInvites: AdvisorInviteDetail[];
}

export const useRFPInvitesWithDetails = (projectId: string) => {
  return useQuery({
    queryKey: ['rfp-invites-details', projectId],
    queryFn: async () => {
      console.log('[useRFPInvitesWithDetails] Fetching RFPs for project:', projectId);

      // FIXED: Query proposals with rfp_invite_id for accurate matching
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

      // FIXED: Fetch proposals with rfp_invite_id for accurate linking
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
          // Direct link via rfp_invite_id
          proposalByInviteId.set(p.rfp_invite_id, { id: p.id, submitted_at: p.submitted_at });
        } else {
          // Legacy proposal without rfp_invite_id - use for temporal fallback
          legacyProposals.push({ id: p.id, advisor_id: p.advisor_id, submitted_at: p.submitted_at });
        }
      });

      // Transform data
      const rfpsWithInvites: RFPWithInvites[] = rfps.map(rfp => {
        const invites = (rfp.rfp_invites as any[]) || [];
        
        const advisorInvites: AdvisorInviteDetail[] = invites.map(invite => {
          const advisor = invite.advisors;
          const advisorType = invite.advisor_type || advisor?.expertise?.[0] || 'לא מוגדר';
          
          // FIXED: Look up proposal by invite ID first
          let proposalId: string | undefined = proposalByInviteId.get(invite.id)?.id;
          
          // Fallback for legacy proposals: match by advisor_id AND temporal constraint
          if (!proposalId) {
            const legacyMatch = legacyProposals.find(lp => 
              lp.advisor_id === invite.advisor_id &&
              new Date(lp.submitted_at) >= new Date(invite.created_at)
            );
            if (legacyMatch) {
              proposalId = legacyMatch.id;
            }
          }

          return {
            inviteId: invite.id,
            advisorId: invite.advisor_id,
            advisorName: advisor?.company_name || 'לא ידוע',
            advisorType,
            status: invite.status,
            proposalId,
            declineReason: invite.decline_reason,
            email: invite.email,
            deadlineAt: invite.deadline_at,
            createdAt: invite.created_at,
          };
        });

        return {
          rfpId: rfp.id,
          subject: rfp.subject,
          sentAt: rfp.sent_at,
          totalInvites: invites.length,
          advisorInvites,
        };
      });

      console.log('[useRFPInvitesWithDetails] Processed RFPs:', rfpsWithInvites.length);
      
      return rfpsWithInvites;
    },
    enabled: !!projectId,
    ...CACHE_TIMES.REALTIME,
  });
};

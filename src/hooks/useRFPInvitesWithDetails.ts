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

      // OPTIMIZED: Single query with all needed data using proper joins
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
            advisors!rfp_invites_advisor_id_fkey (
              id,
              company_name,
              expertise
            )
          ),
          projects!rfps_project_id_fkey (
            proposals!proposals_project_id_fkey (
              id,
              advisor_id
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

      // OPTIMIZED: Extract proposals from the join result
      const proposals = (rfps[0] as any)?.projects?.proposals || [];
      
      // Create proposal map for quick lookup (string type)
      const proposalMap = new Map<string, string>(
        proposals.map((p: any) => [p.advisor_id as string, p.id as string])
      );

      // Transform data
      const rfpsWithInvites: RFPWithInvites[] = rfps.map(rfp => {
        const invites = (rfp.rfp_invites as any[]) || [];
        
        const advisorInvites: AdvisorInviteDetail[] = invites.map(invite => {
          const advisor = invite.advisors;
          const advisorType = invite.advisor_type || advisor?.expertise?.[0] || 'לא מוגדר';
          const proposalId: string | undefined = proposalMap.get(invite.advisor_id);

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

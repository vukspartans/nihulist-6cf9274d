import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdvisorTypeMetrics {
  type: string;
  invitesSent: number;
  proposalsReceived: number;
  status: 'פתוח' | 'ממתין' | 'סגור';
  proposalIds: string[];
}

export interface RFPMetrics {
  rfpId: string;
  sentAt: string;
  subject: string;
  advisorTypes: AdvisorTypeMetrics[];
}

export const useProjectRFPs = (projectId: string) => {
  return useQuery({
    queryKey: ['project-rfps', projectId],
    queryFn: async () => {
      // Fetch all RFPs for this project
      const { data: rfps, error: rfpsError } = await supabase
        .from('rfps')
        .select('id, sent_at, subject')
        .eq('project_id', projectId)
        .order('sent_at', { ascending: false });

      if (rfpsError) throw rfpsError;
      if (!rfps || rfps.length === 0) return [];

      // For each RFP, fetch invites and proposals
      const rfpMetrics: RFPMetrics[] = await Promise.all(
        rfps.map(async (rfp) => {
          // Get all invites for this RFP
          const { data: invites, error: invitesError } = await supabase
            .from('rfp_invites')
            .select('id, advisor_id')
            .eq('rfp_id', rfp.id);

          if (invitesError) throw invitesError;

          // Get all proposals for this project
          const { data: proposals, error: proposalsError } = await supabase
            .from('proposals')
            .select('id, advisor_id')
            .eq('project_id', projectId);

          if (proposalsError) throw proposalsError;

          // Get advisor details for all invited advisors
          const advisorIds = invites?.map(inv => inv.advisor_id).filter(Boolean) || [];
          
          if (advisorIds.length === 0) {
            return {
              rfpId: rfp.id,
              sentAt: rfp.sent_at,
              subject: rfp.subject,
              advisorTypes: [],
            };
          }

          const { data: advisors, error: advisorsError } = await supabase
            .from('advisors')
            .select('id, expertise')
            .in('id', advisorIds);

          if (advisorsError) throw advisorsError;

          // Group by advisor type (expertise)
          const typeMap = new Map<string, AdvisorTypeMetrics>();

          advisors?.forEach(advisor => {
            const invitesForAdvisor = invites?.filter(inv => inv.advisor_id === advisor.id) || [];
            const proposalsForAdvisor = proposals?.filter(p => p.advisor_id === advisor.id) || [];

            // Use first expertise as type or fallback
            const expertise = advisor.expertise?.[0] || 'לא מוגדר';

            if (!typeMap.has(expertise)) {
              typeMap.set(expertise, {
                type: expertise,
                invitesSent: 0,
                proposalsReceived: 0,
                status: 'פתוח',
                proposalIds: [],
              });
            }

            const metrics = typeMap.get(expertise)!;
            metrics.invitesSent += invitesForAdvisor.length;
            metrics.proposalsReceived += proposalsForAdvisor.length;
            metrics.proposalIds.push(...proposalsForAdvisor.map(p => p.id));
          });

          // Calculate status for each type based on response rate
          typeMap.forEach(metrics => {
            const responseRate = metrics.invitesSent > 0 
              ? (metrics.proposalsReceived / metrics.invitesSent) * 100 
              : 0;

            if (responseRate >= 70 || metrics.proposalsReceived === metrics.invitesSent) {
              metrics.status = 'סגור';
            } else if (responseRate >= 30) {
              metrics.status = 'ממתין';
            } else {
              metrics.status = 'פתוח';
            }
          });

          return {
            rfpId: rfp.id,
            sentAt: rfp.sent_at,
            subject: rfp.subject,
            advisorTypes: Array.from(typeMap.values()),
          };
        })
      );

      return rfpMetrics;
    },
    enabled: !!projectId,
  });
};

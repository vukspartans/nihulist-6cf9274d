import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_TIMES } from '@/utils/constants';

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
      // OPTIMIZED: Fetch all RFPs with invites in single query
      const { data: rfps, error: rfpsError } = await supabase
        .from('rfps')
        .select(`
          id, 
          sent_at, 
          subject,
          rfp_invites!rfp_invites_rfp_id_fkey (
            id,
            advisor_id
          )
        `)
        .eq('project_id', projectId)
        .order('sent_at', { ascending: false });

      if (rfpsError) throw rfpsError;
      if (!rfps || rfps.length === 0) return [];

      // OPTIMIZED: Fetch all proposals for project once
      const { data: proposals, error: proposalsError } = await supabase
        .from('proposals')
        .select('id, advisor_id')
        .eq('project_id', projectId);

      if (proposalsError) throw proposalsError;

      // OPTIMIZED: Get all unique advisor IDs from all RFPs
      const allAdvisorIds = Array.from(
        new Set(
          rfps.flatMap(rfp => 
            (rfp.rfp_invites as any[])?.map(inv => inv.advisor_id).filter(Boolean) || []
          )
        )
      );

      if (allAdvisorIds.length === 0) {
        return rfps.map(rfp => ({
          rfpId: rfp.id,
          sentAt: rfp.sent_at,
          subject: rfp.subject,
          advisorTypes: [],
        }));
      }

      // OPTIMIZED: Fetch all advisors in one query
      const { data: advisors, error: advisorsError } = await supabase
        .from('advisors')
        .select('id, expertise')
        .in('id', allAdvisorIds);

      if (advisorsError) throw advisorsError;

      // Create advisor map for fast lookup
      const advisorMap = new Map(advisors?.map(a => [a.id, a]) || []);

      // OPTIMIZED: Process each RFP using pre-loaded data
      const rfpMetrics: RFPMetrics[] = rfps.map((rfp) => {
        const invites = (rfp.rfp_invites as any[]) || [];
        
        // Group by advisor type (expertise)
        const typeMap = new Map<string, AdvisorTypeMetrics>();

        invites.forEach(invite => {
          const advisor = advisorMap.get(invite.advisor_id);
          if (!advisor) return;

          const proposalsForAdvisor = proposals?.filter(p => p.advisor_id === advisor.id) || [];
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
          metrics.invitesSent += 1;
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
      });

      return rfpMetrics;
    },
    enabled: !!projectId,
    // Apply caching for performance
    ...CACHE_TIMES.REALTIME,
  });
};

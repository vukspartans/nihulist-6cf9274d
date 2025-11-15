import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandling';

export interface RFPInvite {
  id: string;
  rfp_id: string;
  advisor_type?: string;
  status: string;
  created_at: string;
  decline_reason?: string;
  decline_note?: string;
  rfps: {
    id: string;
    subject: string;
    body_html: string;
    sent_at: string;
    projects: {
      id: string;
      name: string;
      type: string;
      location: string;
      budget: number;
      timeline_start: string;
      timeline_end: string;
      description: string;
    };
  };
}

export const useAdvisorRFPInvites = (advisorId: string | undefined) => {
  return useQuery({
    queryKey: ['advisor', 'rfp-invites', advisorId],
    queryFn: async () => {
      if (!advisorId) throw new Error('Advisor ID is required');

      // Single query with joins - eliminates N+1 pattern
      const { data, error } = await supabase
        .from('rfp_invites')
        .select(`
          id,
          rfp_id,
          advisor_type,
          status,
          created_at,
          decline_reason,
          decline_note,
          rfps!inner (
            id,
            subject,
            body_html,
            sent_at,
            projects!inner (
              id,
              name,
              type,
              location,
              budget,
              timeline_start,
              timeline_end,
              description
            )
          )
        `)
        .eq('advisor_id', advisorId)
        .order('created_at', { ascending: false });

      if (error) {
        handleError(error, {
          action: 'load_rfp_invites',
          metadata: { advisorId },
        }, {
          customMessage: 'שגיאה בטעינת הזמנות להצעות מחיר',
        });
        throw error;
      }
      
      return (data as any[]) as RFPInvite[];
    },
    enabled: !!advisorId,
    staleTime: 1 * 60 * 1000, // 1 minute - real-time data
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
  });
};

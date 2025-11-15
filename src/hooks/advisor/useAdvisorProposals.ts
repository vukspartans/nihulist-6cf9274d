import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandling';

export interface AdvisorProposal {
  id: string;
  price: number;
  timeline_days: number;
  status: string;
  submitted_at: string;
  project_id: string;
  projects: {
    name: string;
    type: string;
    location: string;
  };
  project_advisors?: Array<{
    selected_at: string;
    selected_by: string;
    start_date?: string;
    end_date?: string;
    fee_amount?: number;
    fee_currency?: string;
    payment_terms?: string;
    scope_of_work?: string;
    agreement_url?: string;
  }>;
}

export const useAdvisorProposals = (advisorId: string | undefined) => {
  return useQuery({
    queryKey: ['advisor', 'proposals', advisorId],
    queryFn: async () => {
      if (!advisorId) throw new Error('Advisor ID is required');

      // Single query with joins - eliminates N+1 pattern
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id,
          price,
          timeline_days,
          status,
          submitted_at,
          project_id,
          projects!inner (
            name,
            type,
            location
          ),
          project_advisors (
            selected_at,
            selected_by,
            start_date,
            end_date,
            fee_amount,
            fee_currency,
            payment_terms,
            scope_of_work,
            agreement_url
          )
        `)
        .eq('advisor_id', advisorId)
        .order('submitted_at', { ascending: false });

      if (error) {
        handleError(error, {
          action: 'load_proposals',
          metadata: { advisorId },
        }, {
          customMessage: 'שגיאה בטעינת הצעות המחיר',
        });
        throw error;
      }
      
      return (data as any[]) as AdvisorProposal[];
    },
    enabled: !!advisorId,
    staleTime: 1 * 60 * 1000, // 1 minute - real-time data
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
  });
};

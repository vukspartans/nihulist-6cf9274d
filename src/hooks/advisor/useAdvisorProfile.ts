import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandling';

export interface AdvisorProfile {
  id: string;
  company_name: string;
  expertise: string[];
  specialties: string[];
  location: string;
  rating: number;
  founding_year: number | null;
  activity_regions: string[] | null;
  office_size: string | null;
  office_phone: string | null;
  position_in_office: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  admin_approved: boolean;
}

export const useAdvisorProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['advisor', 'profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('advisors')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        handleError(error, {
          action: 'load_advisor_profile',
          userId,
        }, {
          customMessage: 'שגיאה בטעינת פרטי היועץ',
        });
        throw error;
      }
      
      return data as AdvisorProfile;
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

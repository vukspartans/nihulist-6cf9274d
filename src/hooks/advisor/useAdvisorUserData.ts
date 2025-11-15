import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandling';

export interface UserProfile {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export const useAdvisorUserData = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['advisor', 'user-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, email')
        .eq('user_id', userId)
        .single();

      if (error) {
        handleError(error, {
          action: 'load_user_profile',
          userId,
        }, {
          customMessage: 'שגיאה בטעינת פרטי המשתמש',
        });
        throw error;
      }
      
      return data as UserProfile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

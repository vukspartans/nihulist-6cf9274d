import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/utils/errorHandling';

export const useLogoUpload = (advisorId: string | undefined, userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!advisorId || !userId) throw new Error('Advisor ID and User ID are required');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `advisor-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      // Update advisor profile
      const { error: updateError } = await supabase
        .from('advisors')
        .update({ logo_url: publicUrl })
        .eq('id', advisorId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      // Invalidate advisor profile query to refetch
      queryClient.invalidateQueries({ queryKey: ['advisor', 'profile', userId] });
      
      toast({
        title: 'הלוגו עודכן בהצלחה',
        description: 'הלוגו החדש שלך נשמר',
      });
    },
    onError: (error: any) => {
      handleError(error, {
        action: 'upload_logo',
        userId,
        metadata: { advisorId },
      }, {
        customMessage: 'שגיאה בהעלאת הלוגו',
      });
    },
  });
};

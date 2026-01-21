import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  PaymentStatusDefinition, 
  CreatePaymentStatusInput, 
  UpdatePaymentStatusInput,
  SignatureType 
} from '@/types/paymentStatus';

const QUERY_KEY = 'payment-status-definitions';

export const usePaymentStatusDefinitions = (includeInactive = true) => {
  return useQuery({
    queryKey: [QUERY_KEY, includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('payment_status_definitions')
        .select('*')
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map(item => ({
        ...item,
        signature_type: item.signature_type as SignatureType,
      })) as PaymentStatusDefinition[];
    },
  });
};

export const useCreatePaymentStatusDefinition = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreatePaymentStatusInput) => {
      const { data, error } = await supabase
        .from('payment_status_definitions')
        .insert({
          code: input.code,
          name: input.name,
          name_en: input.name_en || null,
          description: input.description || null,
          color: input.color || '#6B7280',
          icon: input.icon || null,
          is_system: false, // Custom statuses are never system
          is_terminal: input.is_terminal || false,
          is_active: input.is_active !== false,
          display_order: input.display_order || 0,
          notify_on_enter: input.notify_on_enter !== false,
          notify_roles: input.notify_roles || [],
          requires_signature: input.requires_signature || false,
          signature_type: input.signature_type || 'none',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false });
      toast({
        title: 'שלב אישור נוסף בהצלחה',
      });
    },
    onError: (error: Error) => {
      console.error('Error creating payment status:', error);
      toast({
        title: 'שגיאה ביצירת שלב אישור',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdatePaymentStatusDefinition = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdatePaymentStatusInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('payment_status_definitions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false });
      toast({
        title: 'שלב אישור עודכן בהצלחה',
      });
    },
    onError: (error: Error) => {
      console.error('Error updating payment status:', error);
      toast({
        title: 'שגיאה בעדכון שלב אישור',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeletePaymentStatusDefinition = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_status_definitions')
        .delete()
        .eq('id', id)
        .eq('is_system', false); // Only allow deleting non-system statuses

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false });
      toast({
        title: 'שלב אישור נמחק בהצלחה',
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting payment status:', error);
      toast({
        title: 'שגיאה במחיקת שלב אישור',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useReorderPaymentStatuses = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderedIds: { id: string; display_order: number }[]) => {
      const promises = orderedIds.map(({ id, display_order }) =>
        supabase
          .from('payment_status_definitions')
          .update({ display_order })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error('Failed to reorder some statuses');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false });
    },
    onError: (error: Error) => {
      console.error('Error reordering statuses:', error);
      toast({
        title: 'שגיאה בשינוי סדר',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

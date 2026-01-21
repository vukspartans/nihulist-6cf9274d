import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentCategory {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  icon: string | null;
  color: string;
  is_system: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentCategoryInput {
  name: string;
  name_en?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdatePaymentCategoryInput extends Partial<CreatePaymentCategoryInput> {
  id: string;
}

export function usePaymentCategories(includeInactive = true) {
  return useQuery({
    queryKey: ["payment-categories", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("payment_categories")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PaymentCategory[];
    },
  });
}

export function useCreatePaymentCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreatePaymentCategoryInput) => {
      const { data, error } = await supabase
        .from("payment_categories")
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as PaymentCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-categories"] });
      toast.success("הקטגוריה נוצרה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error creating payment category:", error);
      toast.error("שגיאה ביצירת הקטגוריה");
    },
  });
}

export function useUpdatePaymentCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePaymentCategoryInput) => {
      const { data, error } = await supabase
        .from("payment_categories")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as PaymentCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-categories"] });
      toast.success("הקטגוריה עודכנה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error updating payment category:", error);
      toast.error("שגיאה בעדכון הקטגוריה");
    },
  });
}

export function useDeletePaymentCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_categories")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-categories"] });
      toast.success("הקטגוריה נמחקה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error deleting payment category:", error);
      toast.error("שגיאה במחיקת הקטגוריה");
    },
  });
}

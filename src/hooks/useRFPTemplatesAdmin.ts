import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ============ TYPES ============

export interface FeeItemTemplate {
  id: string;
  advisor_specialty: string;
  description: string;
  unit: string;
  default_quantity: number | null;
  charge_type: string | null;
  is_optional: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceScopeTemplate {
  id: string;
  advisor_specialty: string;
  task_name: string;
  default_fee_category: string | null;
  is_optional: boolean;
  display_order: number;
  category_id: string | null;
  project_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFeeItemTemplateInput {
  advisor_specialty: string;
  description: string;
  unit: string;
  default_quantity?: number;
  charge_type?: string;
  is_optional?: boolean;
  display_order?: number;
}

export interface UpdateFeeItemTemplateInput extends Partial<CreateFeeItemTemplateInput> {
  id: string;
}

export interface CreateServiceScopeTemplateInput {
  advisor_specialty: string;
  task_name: string;
  default_fee_category?: string;
  is_optional?: boolean;
  display_order?: number;
  category_id?: string;
  project_type?: string;
}

export interface UpdateServiceScopeTemplateInput extends Partial<CreateServiceScopeTemplateInput> {
  id: string;
}

// ============ QUERY KEYS ============

const FEE_ITEM_QUERY_KEY = "fee-item-templates-admin";
const SERVICE_SCOPE_QUERY_KEY = "service-scope-templates-admin";

// ============ FEE ITEM TEMPLATES HOOKS ============

export function useFeeItemTemplates(advisorSpecialty?: string) {
  return useQuery({
    queryKey: [FEE_ITEM_QUERY_KEY, advisorSpecialty],
    queryFn: async () => {
      let query = supabase
        .from("default_fee_item_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (advisorSpecialty) {
        query = query.eq("advisor_specialty", advisorSpecialty);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeeItemTemplate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
    refetchOnWindowFocus: false,
  });
}

export function useCreateFeeItemTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateFeeItemTemplateInput) => {
      // Get max display_order for this specialty
      const { data: existing } = await supabase
        .from("default_fee_item_templates")
        .select("display_order")
        .eq("advisor_specialty", input.advisor_specialty)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 
        ? (existing[0].display_order || 0) + 1 
        : 0;

      const { data, error } = await supabase
        .from("default_fee_item_templates")
        .insert({
          ...input,
          display_order: input.display_order ?? nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FEE_ITEM_QUERY_KEY], exact: false });
      toast({ title: "פריט שכר טרחה נוצר בהצלחה" });
    },
    onError: (error: Error) => {
      console.error("Error creating fee item template:", error);
      toast({
        title: "שגיאה ביצירת פריט",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateFeeItemTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateFeeItemTemplateInput) => {
      const { data, error } = await supabase
        .from("default_fee_item_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FEE_ITEM_QUERY_KEY], exact: false });
      toast({ title: "פריט שכר טרחה עודכן בהצלחה" });
    },
    onError: (error: Error) => {
      console.error("Error updating fee item template:", error);
      toast({
        title: "שגיאה בעדכון פריט",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFeeItemTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("default_fee_item_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FEE_ITEM_QUERY_KEY], exact: false });
      toast({ title: "פריט שכר טרחה נמחק בהצלחה" });
    },
    onError: (error: Error) => {
      console.error("Error deleting fee item template:", error);
      toast({
        title: "שגיאה במחיקת פריט",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useReorderFeeItemTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: { id: string; display_order: number }[]) => {
      for (const item of orderedIds) {
        const { error } = await supabase
          .from("default_fee_item_templates")
          .update({ display_order: item.display_order })
          .eq("id", item.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FEE_ITEM_QUERY_KEY], exact: false });
    },
    onError: (error: Error) => {
      console.error("Error reordering fee items:", error);
    },
  });
}

// ============ SERVICE SCOPE TEMPLATES HOOKS ============

export function useServiceScopeTemplates(advisorSpecialty?: string, categoryId?: string) {
  return useQuery({
    queryKey: [SERVICE_SCOPE_QUERY_KEY, advisorSpecialty, categoryId],
    queryFn: async () => {
      let query = supabase
        .from("default_service_scope_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      } else if (advisorSpecialty) {
        query = query.eq("advisor_specialty", advisorSpecialty);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ServiceScopeTemplate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
    refetchOnWindowFocus: false,
  });
}

export function useCreateServiceScopeTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateServiceScopeTemplateInput) => {
      // Get max display_order for this specialty
      const { data: existing } = await supabase
        .from("default_service_scope_templates")
        .select("display_order")
        .eq("advisor_specialty", input.advisor_specialty)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 
        ? (existing[0].display_order || 0) + 1 
        : 0;

      const { data, error } = await supabase
        .from("default_service_scope_templates")
        .insert({
          ...input,
          display_order: input.display_order ?? nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_SCOPE_QUERY_KEY], exact: false });
      toast({ title: "שירות נוצר בהצלחה" });
    },
    onError: (error: Error) => {
      console.error("Error creating service scope template:", error);
      toast({
        title: "שגיאה ביצירת שירות",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateServiceScopeTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateServiceScopeTemplateInput) => {
      const { data, error } = await supabase
        .from("default_service_scope_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_SCOPE_QUERY_KEY], exact: false });
      toast({ title: "שירות עודכן בהצלחה" });
    },
    onError: (error: Error) => {
      console.error("Error updating service scope template:", error);
      toast({
        title: "שגיאה בעדכון שירות",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteServiceScopeTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("default_service_scope_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_SCOPE_QUERY_KEY], exact: false });
      toast({ title: "שירות נמחק בהצלחה" });
    },
    onError: (error: Error) => {
      console.error("Error deleting service scope template:", error);
      toast({
        title: "שגיאה במחיקת שירות",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useReorderServiceScopeTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: { id: string; display_order: number }[]) => {
      for (const item of orderedIds) {
        const { error } = await supabase
          .from("default_service_scope_templates")
          .update({ display_order: item.display_order })
          .eq("id", item.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_SCOPE_QUERY_KEY], exact: false });
    },
    onError: (error: Error) => {
      console.error("Error reordering services:", error);
    },
  });
}

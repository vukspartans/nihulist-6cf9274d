import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Municipality {
  id: string;
  name: string;
  region: string | null;
  has_special_requirements: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMunicipalityInput {
  name: string;
  region?: string;
  has_special_requirements?: boolean;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateMunicipalityInput extends Partial<CreateMunicipalityInput> {
  id: string;
}

export function useMunicipalities(includeInactive = true) {
  return useQuery({
    queryKey: ["municipalities", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("municipalities")
        .select("*")
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Municipality[];
    },
  });
}

export function useCreateMunicipality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMunicipalityInput) => {
      const { data, error } = await supabase
        .from("municipalities")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as Municipality;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["municipalities"] });
      toast.success("העירייה נוצרה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error creating municipality:", error);
      toast.error("שגיאה ביצירת העירייה");
    },
  });
}

export function useUpdateMunicipality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateMunicipalityInput) => {
      const { data, error } = await supabase
        .from("municipalities")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Municipality;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["municipalities"] });
      toast.success("העירייה עודכנה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error updating municipality:", error);
      toast.error("שגיאה בעדכון העירייה");
    },
  });
}

export function useDeleteMunicipality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("municipalities")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["municipalities"] });
      toast.success("העירייה נמחקה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error deleting municipality:", error);
      toast.error("שגיאה במחיקת העירייה");
    },
  });
}

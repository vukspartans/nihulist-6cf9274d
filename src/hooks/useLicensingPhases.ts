import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LicensingPhase {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  municipality_id: string | null;
  project_type: string | null;
  default_duration_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  municipalities?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateLicensingPhaseInput {
  name: string;
  description?: string;
  display_order?: number;
  municipality_id?: string | null;
  project_type?: string | null;
  default_duration_days?: number;
  is_active?: boolean;
}

export interface UpdateLicensingPhaseInput extends Partial<CreateLicensingPhaseInput> {
  id: string;
}

export function useLicensingPhases(filters?: { municipalityId?: string; projectType?: string; includeInactive?: boolean }) {
  return useQuery({
    queryKey: ["licensing-phases", filters],
    queryFn: async () => {
      let query = supabase
        .from("licensing_phases")
        .select(`
          *,
          municipalities:municipality_id (id, name)
        `)
        .order("display_order", { ascending: true });

      if (!filters?.includeInactive) {
        query = query.eq("is_active", true);
      }

      if (filters?.municipalityId) {
        query = query.eq("municipality_id", filters.municipalityId);
      }

      if (filters?.projectType) {
        query = query.eq("project_type", filters.projectType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LicensingPhase[];
    },
  });
}

export function useCreateLicensingPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLicensingPhaseInput) => {
      const { data, error } = await supabase
        .from("licensing_phases")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as LicensingPhase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licensing-phases"] });
      toast.success("השלב נוצר בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error creating licensing phase:", error);
      toast.error("שגיאה ביצירת השלב");
    },
  });
}

export function useUpdateLicensingPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLicensingPhaseInput) => {
      const { data, error } = await supabase
        .from("licensing_phases")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LicensingPhase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licensing-phases"] });
      toast.success("השלב עודכן בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error updating licensing phase:", error);
      toast.error("שגיאה בעדכון השלב");
    },
  });
}

export function useDeleteLicensingPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("licensing_phases")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licensing-phases"] });
      toast.success("השלב נמחק בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error deleting licensing phase:", error);
      toast.error("שגיאה במחיקת השלב");
    },
  });
}

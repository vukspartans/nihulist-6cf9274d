import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  phase: string | null;
  default_duration_days: number | null;
  advisor_specialty: string | null;
  is_milestone: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New columns
  municipality_id: string | null;
  licensing_phase_id: string | null;
  is_default: boolean;
  created_by_user_id: string | null;
  is_user_template: boolean;
  template_group_id: string | null;
  depends_on_template_id: string | null;
  // Joined data
  municipalities?: {
    id: string;
    name: string;
  } | null;
  licensing_phases?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateTaskTemplateInput {
  name: string;
  description?: string | null;
  project_type?: string | null;
  phase?: string | null;
  default_duration_days?: number | null;
  advisor_specialty?: string | null;
  is_milestone?: boolean;
  display_order?: number;
  is_active?: boolean;
  municipality_id?: string | null;
  licensing_phase_id?: string | null;
  is_default?: boolean;
  template_group_id?: string | null;
  depends_on_template_id?: string | null;
}

export interface UpdateTaskTemplateInput extends Partial<CreateTaskTemplateInput> {
  id: string;
}

interface TaskTemplateFilters {
  projectType?: string;
  municipalityId?: string;
  includeInactive?: boolean;
  userTemplatesOnly?: boolean;
  systemTemplatesOnly?: boolean;
  templateGroupId?: string;
}

export function useTaskTemplatesAdmin(filters?: TaskTemplateFilters) {
  return useQuery({
    queryKey: ["task-templates-admin", filters],
    queryFn: async () => {
      let query = supabase
        .from("task_templates")
        .select(`
          *,
          municipalities:municipality_id (id, name),
          licensing_phases:licensing_phase_id (id, name)
        `)
        .order("display_order", { ascending: true });

      if (!filters?.includeInactive) {
        query = query.eq("is_active", true);
      }

      if (filters?.projectType) {
        query = query.eq("project_type", filters.projectType);
      }

      if (filters?.municipalityId) {
        query = query.eq("municipality_id", filters.municipalityId);
      }

      if (filters?.userTemplatesOnly) {
        query = query.eq("is_user_template", true);
      }

      if (filters?.systemTemplatesOnly) {
        query = query.eq("is_user_template", false);
      }

      if (filters?.templateGroupId) {
        query = query.eq("template_group_id", filters.templateGroupId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TaskTemplate[];
    },
  });
}

export function useTaskTemplateGroups() {
  return useQuery({
    queryKey: ["task-template-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("template_group_id, project_type, municipality_id")
        .not("template_group_id", "is", null);

      if (error) throw error;

      // Group by template_group_id and count
      const groups = data.reduce((acc, item) => {
        if (item.template_group_id) {
          if (!acc[item.template_group_id]) {
            acc[item.template_group_id] = {
              id: item.template_group_id,
              project_type: item.project_type,
              municipality_id: item.municipality_id,
              count: 0,
            };
          }
          acc[item.template_group_id].count++;
        }
        return acc;
      }, {} as Record<string, { id: string; project_type: string | null; municipality_id: string | null; count: number }>);

      return Object.values(groups);
    },
  });
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskTemplateInput) => {
      const { data, error } = await supabase
        .from("task_templates")
        .insert(input as any)
        .select()
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates-admin"] });
      toast.success("התבנית נוצרה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error creating task template:", error);
      toast.error("שגיאה ביצירת התבנית");
    },
  });
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskTemplateInput) => {
      const { data, error } = await supabase
        .from("task_templates")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates-admin"] });
      toast.success("התבנית עודכנה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error updating task template:", error);
      toast.error("שגיאה בעדכון התבנית");
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates-admin"] });
      toast.success("התבנית נמחקה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error deleting task template:", error);
      toast.error("שגיאה במחיקת התבנית");
    },
  });
}

export function useBulkCreateTaskTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templates: CreateTaskTemplateInput[]) => {
      const { data, error } = await supabase
        .from("task_templates")
        .insert(templates as any)
        .select();

      if (error) throw error;
      return data as TaskTemplate[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates-admin"] });
      toast.success("התבניות נוצרו בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error creating task templates:", error);
      toast.error("שגיאה ביצירת התבניות");
    },
  });
}

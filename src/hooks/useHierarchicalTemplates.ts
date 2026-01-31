import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { HierarchicalTaskTemplate, TemplateDependency } from "@/types/taskHierarchy";

interface HierarchicalTemplateFilters {
  municipalityId?: string;
  projectType?: string;
  licensingPhaseId?: string;
  includeInactive?: boolean;
}

export function useHierarchicalTemplates(filters?: HierarchicalTemplateFilters) {
  return useQuery({
    queryKey: ["hierarchical-templates", filters],
    queryFn: async () => {
      let query = supabase
        .from("task_templates")
        .select(`
          *,
          municipalities:municipality_id (id, name),
          licensing_phases:licensing_phase_id (id, name)
        `)
        .order("hierarchy_path", { ascending: true, nullsFirst: true })
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

      if (filters?.licensingPhaseId) {
        query = query.eq("licensing_phase_id", filters.licensingPhaseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Manually fetch parent templates if needed
      const templatesWithParent = (data || []).map(template => ({
        ...template,
        parent_template: template.parent_template_id 
          ? data?.find(t => t.id === template.parent_template_id) 
            ? { 
                id: data.find(t => t.id === template.parent_template_id)!.id,
                name: data.find(t => t.id === template.parent_template_id)!.name,
                wbs_code: data.find(t => t.id === template.parent_template_id)!.wbs_code
              }
            : null
          : null
      }));
      
      return templatesWithParent as HierarchicalTaskTemplate[];
    },
  });
}

export function useTemplateDependencies(templateId?: string) {
  return useQuery({
    queryKey: ["template-dependencies", templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("template_dependencies")
        .select(`*`)
        .eq("template_id", templateId);

      if (error) throw error;
      
      // Fetch depends_on templates separately
      if (!data || data.length === 0) return [];
      
      const depTemplateIds = data.map(d => d.depends_on_template_id);
      const { data: templates } = await supabase
        .from("task_templates")
        .select("id, name, wbs_code")
        .in("id", depTemplateIds);
      
      const templatesMap = new Map((templates || []).map(t => [t.id, t]));
      
      return data.map(d => ({
        ...d,
        depends_on_template: templatesMap.get(d.depends_on_template_id) || null
      })) as TemplateDependency[];
    },
    enabled: !!templateId,
  });
}

export function useAllTemplateDependencies(filters?: HierarchicalTemplateFilters) {
  return useQuery({
    queryKey: ["all-template-dependencies", filters],
    queryFn: async () => {
      // Get all template IDs matching filters first
      let templatesQuery = supabase
        .from("task_templates")
        .select("id")
        .eq("is_active", true);

      if (filters?.municipalityId) {
        templatesQuery = templatesQuery.eq("municipality_id", filters.municipalityId);
      }
      if (filters?.projectType) {
        templatesQuery = templatesQuery.eq("project_type", filters.projectType);
      }
      if (filters?.licensingPhaseId) {
        templatesQuery = templatesQuery.eq("licensing_phase_id", filters.licensingPhaseId);
      }

      const { data: templates, error: templatesError } = await templatesQuery;
      if (templatesError) throw templatesError;

      if (!templates || templates.length === 0) return [];

      const templateIds = templates.map(t => t.id);

      const { data, error } = await supabase
        .from("template_dependencies")
        .select(`*`)
        .in("template_id", templateIds);

      if (error) throw error;
      
      if (!data || data.length === 0) return [];
      
      // Fetch depends_on templates separately
      const depTemplateIds = [...new Set(data.map(d => d.depends_on_template_id))];
      const { data: depTemplates } = await supabase
        .from("task_templates")
        .select("id, name, wbs_code")
        .in("id", depTemplateIds);
      
      const templatesMap = new Map((depTemplates || []).map(t => [t.id, t]));
      
      return data.map(d => ({
        ...d,
        depends_on_template: templatesMap.get(d.depends_on_template_id) || null
      })) as TemplateDependency[];
    },
  });
}

export function useCreateTemplateDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      template_id: string;
      depends_on_template_id: string;
      dependency_type?: string;
      lag_days?: number;
    }) => {
      const { data, error } = await supabase
        .from("template_dependencies")
        .insert({
          template_id: input.template_id,
          depends_on_template_id: input.depends_on_template_id,
          dependency_type: input.dependency_type || 'finish_to_start',
          lag_days: input.lag_days || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["all-template-dependencies"] });
      toast.success("התלות נוספה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error creating dependency:", error);
      toast.error("שגיאה בהוספת התלות");
    },
  });
}

export function useDeleteTemplateDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_dependencies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["all-template-dependencies"] });
      toast.success("התלות הוסרה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error deleting dependency:", error);
      toast.error("שגיאה בהסרת התלות");
    },
  });
}

export function useUpdateTemplateHierarchy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      parent_template_id: string | null;
      hierarchy_path: string;
      hierarchy_level: number;
      wbs_code: string;
    }) => {
      const { data, error } = await supabase
        .from("task_templates")
        .update({
          parent_template_id: input.parent_template_id,
          hierarchy_path: input.hierarchy_path,
          hierarchy_level: input.hierarchy_level,
          wbs_code: input.wbs_code,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hierarchical-templates"] });
      queryClient.invalidateQueries({ queryKey: ["task-templates-admin"] });
      toast.success("ההיררכיה עודכנה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("Error updating hierarchy:", error);
      toast.error("שגיאה בעדכון ההיררכיה");
    },
  });
}

// Helper function to build tree structure from flat list
export function buildTemplateTree(templates: HierarchicalTaskTemplate[]): HierarchicalTaskTemplate[] {
  const map = new Map<string, HierarchicalTaskTemplate>();
  const roots: HierarchicalTaskTemplate[] = [];

  // First pass: create map
  templates.forEach(t => {
    map.set(t.id, { ...t, children: [] });
  });

  // Second pass: build tree
  templates.forEach(t => {
    const node = map.get(t.id)!;
    if (t.parent_template_id && map.has(t.parent_template_id)) {
      map.get(t.parent_template_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Helper function to generate WBS code
export function generateWBSCode(parentWBS: string | null, index: number): string {
  const childNumber = (index + 1).toString();
  return parentWBS ? `${parentWBS}.${childNumber}` : childNumber;
}

// Helper function to generate hierarchy path (for sorting)
export function generateHierarchyPath(parentPath: string | null, index: number): string {
  const paddedIndex = index.toString().padStart(3, '0');
  return parentPath ? `${parentPath}.${paddedIndex}` : paddedIndex;
}

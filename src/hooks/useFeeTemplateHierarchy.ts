import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  FeeTemplateCategory,
  FeeSubmissionMethod,
  CreateFeeCategoryInput,
  UpdateFeeCategoryInput,
  CreateSubmissionMethodInput,
  UpdateSubmissionMethodInput,
  AdvisorTypeSummary,
  ProjectTypeSummary,
} from "@/types/feeTemplateHierarchy";

// ============ Query Keys ============
const CATEGORY_KEY = "fee-template-categories";
const METHOD_KEY = "fee-submission-methods";
const HIERARCHY_KEY = "fee-template-hierarchy";

// ============ Categories Hooks ============

export function useFeeTemplateCategories(advisorSpecialty?: string, projectType?: string) {
  return useQuery({
    queryKey: [CATEGORY_KEY, advisorSpecialty, projectType],
    queryFn: async () => {
      let query = supabase
        .from("fee_template_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (advisorSpecialty) {
        query = query.eq("advisor_specialty", advisorSpecialty);
      }
      if (projectType) {
        query = query.eq("project_type", projectType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeeTemplateCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFeeCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateFeeCategoryInput) => {
      // If setting as default, unset other defaults first
      if (input.is_default) {
        await supabase
          .from("fee_template_categories")
          .update({ is_default: false })
          .eq("advisor_specialty", input.advisor_specialty)
          .eq("project_type", input.project_type || "");
      }

      const { data, error } = await supabase
        .from("fee_template_categories")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_KEY] });
      queryClient.invalidateQueries({ queryKey: [HIERARCHY_KEY] });
      toast({ title: "קטגוריה נוצרה בהצלחה" });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה ביצירת קטגוריה", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateFeeCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateFeeCategoryInput) => {
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        const { data: current } = await supabase
          .from("fee_template_categories")
          .select("advisor_specialty, project_type")
          .eq("id", id)
          .single();

        if (current) {
          await supabase
            .from("fee_template_categories")
            .update({ is_default: false })
            .eq("advisor_specialty", current.advisor_specialty)
            .eq("project_type", current.project_type || "")
            .neq("id", id);
        }
      }

      const { data, error } = await supabase
        .from("fee_template_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_KEY] });
      toast({ title: "קטגוריה עודכנה בהצלחה" });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה בעדכון קטגוריה", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteFeeCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fee_template_categories")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_KEY] });
      queryClient.invalidateQueries({ queryKey: [HIERARCHY_KEY] });
      toast({ title: "קטגוריה נמחקה בהצלחה" });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה במחיקת קטגוריה", description: error.message, variant: "destructive" });
    },
  });
}

// ============ Submission Methods Hooks ============

export function useFeeSubmissionMethods(categoryId?: string) {
  return useQuery({
    queryKey: [METHOD_KEY, categoryId],
    queryFn: async () => {
      let query = supabase
        .from("fee_submission_methods")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeeSubmissionMethod[];
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSubmissionMethod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSubmissionMethodInput) => {
      // If setting as default, unset other defaults first
      if (input.is_default) {
        await supabase
          .from("fee_submission_methods")
          .update({ is_default: false })
          .eq("category_id", input.category_id);
      }

      const { data, error } = await supabase
        .from("fee_submission_methods")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [METHOD_KEY] });
      toast({ title: "שיטת הגשה נוצרה בהצלחה" });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה ביצירת שיטת הגשה", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateSubmissionMethod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSubmissionMethodInput) => {
      // If setting as default, unset other defaults first
      if (updates.is_default && updates.category_id) {
        await supabase
          .from("fee_submission_methods")
          .update({ is_default: false })
          .eq("category_id", updates.category_id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("fee_submission_methods")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [METHOD_KEY] });
      toast({ title: "שיטת הגשה עודכנה בהצלחה" });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה בעדכון שיטת הגשה", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteSubmissionMethod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fee_submission_methods")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [METHOD_KEY] });
      toast({ title: "שיטת הגשה נמחקה בהצלחה" });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה במחיקת שיטת הגשה", description: error.message, variant: "destructive" });
    },
  });
}

// ============ Hierarchy Aggregation Hooks ============

export function useAdvisorTypeSummary() {
  return useQuery({
    queryKey: [HIERARCHY_KEY, "advisor-summary"],
    queryFn: async () => {
      // Get unique advisor specialties from categories
      const { data: categories, error: catError } = await supabase
        .from("fee_template_categories")
        .select("advisor_specialty")
        .eq("is_active", true);

      if (catError) throw catError;

      // Get counts from templates
      const { data: templates, error: tmpError } = await supabase
        .from("default_fee_item_templates")
        .select("advisor_specialty");

      if (tmpError) throw tmpError;

      // Aggregate
      const advisorMap = new Map<string, AdvisorTypeSummary>();

      // Add from categories
      categories?.forEach((cat) => {
        if (!advisorMap.has(cat.advisor_specialty)) {
          advisorMap.set(cat.advisor_specialty, {
            advisor_specialty: cat.advisor_specialty,
            category_count: 0,
            template_count: 0,
          });
        }
        const existing = advisorMap.get(cat.advisor_specialty)!;
        existing.category_count++;
      });

      // Add template counts
      templates?.forEach((tmp) => {
        if (!advisorMap.has(tmp.advisor_specialty)) {
          advisorMap.set(tmp.advisor_specialty, {
            advisor_specialty: tmp.advisor_specialty,
            category_count: 0,
            template_count: 0,
          });
        }
        const existing = advisorMap.get(tmp.advisor_specialty)!;
        existing.template_count++;
      });

      return Array.from(advisorMap.values()).sort((a, b) => 
        a.advisor_specialty.localeCompare(b.advisor_specialty, 'he')
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectTypeSummary(advisorSpecialty: string) {
  return useQuery({
    queryKey: [HIERARCHY_KEY, "project-summary", advisorSpecialty],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_template_categories")
        .select("project_type")
        .eq("advisor_specialty", advisorSpecialty)
        .eq("is_active", true);

      if (error) throw error;

      // Aggregate by project type
      const projectMap = new Map<string, number>();
      data?.forEach((cat) => {
        const pt = cat.project_type || "כללי";
        projectMap.set(pt, (projectMap.get(pt) || 0) + 1);
      });

      const result: ProjectTypeSummary[] = Array.from(projectMap.entries()).map(
        ([project_type, category_count]) => ({ project_type, category_count })
      );

      return result.sort((a, b) => a.project_type.localeCompare(b.project_type, 'he'));
    },
    enabled: !!advisorSpecialty,
    staleTime: 5 * 60 * 1000,
  });
}

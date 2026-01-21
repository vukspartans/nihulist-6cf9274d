import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  MilestoneTemplate, 
  MilestoneTemplateTask, 
  CreateMilestoneTemplateInput, 
  UpdateMilestoneTemplateInput 
} from '@/types/milestoneTemplate';

// Fetch all milestone templates
export function useMilestoneTemplates(includeInactive = true) {
  return useQuery({
    queryKey: ['milestone-templates', { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from('milestone_templates')
        .select(`
          *,
          municipalities (id, name)
        `)
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MilestoneTemplate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
    refetchOnWindowFocus: false,
  });
}

// Fetch single milestone template with linked tasks
export function useMilestoneTemplate(id: string) {
  return useQuery({
    queryKey: ['milestone-template', id],
    queryFn: async () => {
      const { data: template, error: templateError } = await supabase
        .from('milestone_templates')
        .select(`
          *,
          municipalities (id, name)
        `)
        .eq('id', id)
        .single();

      if (templateError) throw templateError;

      const { data: linkedTasks, error: tasksError } = await supabase
        .from('milestone_template_tasks')
        .select(`
          *,
          task_templates (id, name)
        `)
        .eq('milestone_template_id', id)
        .order('display_order', { ascending: true });

      if (tasksError) throw tasksError;

      return {
        ...template,
        linked_tasks: linkedTasks,
      } as MilestoneTemplate;
    },
    enabled: !!id,
  });
}

// Create milestone template
export function useCreateMilestoneTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateMilestoneTemplateInput) => {
      const { data, error } = await supabase
        .from('milestone_templates')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-templates'] });
      toast({
        title: 'אבן דרך נוצרה בהצלחה',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה ביצירת אבן דרך',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update milestone template
export function useUpdateMilestoneTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateMilestoneTemplateInput) => {
      const { data, error } = await supabase
        .from('milestone_templates')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestone-templates'] });
      queryClient.invalidateQueries({ queryKey: ['milestone-template', variables.id] });
      toast({
        title: 'אבן דרך עודכנה בהצלחה',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בעדכון אבן דרך',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete milestone template
export function useDeleteMilestoneTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milestone_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-templates'] });
      toast({
        title: 'אבן דרך נמחקה בהצלחה',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה במחיקת אבן דרך',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Link task to milestone
export function useLinkTaskToMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      milestone_template_id,
      task_template_id,
      is_critical = true,
      display_order = 0,
    }: {
      milestone_template_id: string;
      task_template_id: string;
      is_critical?: boolean;
      display_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('milestone_template_tasks')
        .insert({
          milestone_template_id,
          task_template_id,
          is_critical,
          display_order,
        })
        .select(`
          *,
          task_templates (id, name)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['milestone-template', variables.milestone_template_id] 
      });
      toast({
        title: 'משימה שויכה בהצלחה',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בשיוך משימה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Unlink task from milestone
export function useUnlinkTaskFromMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      milestone_template_id,
    }: {
      id: string;
      milestone_template_id: string;
    }) => {
      const { error } = await supabase
        .from('milestone_template_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['milestone-template', variables.milestone_template_id] 
      });
      toast({
        title: 'שיוך משימה הוסר בהצלחה',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בהסרת שיוך משימה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Reorder milestone templates
export function useReorderMilestoneTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderedIds: { id: string; display_order: number }[]) => {
      const promises = orderedIds.map(({ id, display_order }) =>
        supabase
          .from('milestone_templates')
          .update({ 
            display_order,
            updated_at: new Date().toISOString() 
          })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error('Failed to reorder milestones');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-templates'] });
      toast({
        title: 'הסדר עודכן בהצלחה',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בעדכון סדר',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

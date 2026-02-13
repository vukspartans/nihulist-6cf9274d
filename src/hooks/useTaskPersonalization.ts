import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TaskTemplate } from '@/hooks/useTaskTemplatesAdmin';

export interface TaskPersonalization {
  id: string;
  template_id: string | null;
  task_name: string;
  custom_name: string | null;
  custom_description: string | null;
  custom_duration_days: number | null;
  custom_advisor_specialty: string | null;
  custom_notes: string | null;
  project_type: string;
  usage_count: number;
}

export function useTaskPersonalization() {
  const getPersonalizations = useCallback(async (projectType: string): Promise<TaskPersonalization[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_task_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_type', projectType);

    if (error) {
      console.error('Error fetching personalizations:', error);
      return [];
    }
    return (data || []) as TaskPersonalization[];
  }, []);

  const saveCustomization = useCallback(async (
    taskName: string,
    templateId: string | null,
    projectType: string,
    customFields: {
      custom_name?: string | null;
      custom_description?: string | null;
      custom_duration_days?: number | null;
      custom_advisor_specialty?: string | null;
      custom_notes?: string | null;
    }
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if preference already exists
    const { data: existing } = await supabase
      .from('user_task_preferences')
      .select('id, usage_count')
      .eq('user_id', user.id)
      .eq('task_name', taskName)
      .eq('project_type', projectType)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_task_preferences')
        .update({
          ...customFields,
          template_id: templateId,
          usage_count: (existing.usage_count || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_task_preferences')
        .insert({
          user_id: user.id,
          task_name: taskName,
          template_id: templateId,
          project_type: projectType,
          ...customFields,
        });
    }
  }, []);

  const applyPersonalizations = useCallback((
    templates: TaskTemplate[],
    personalizations: TaskPersonalization[]
  ): TaskTemplate[] => {
    if (!personalizations.length) return templates;

    const prefMap = new Map<string, TaskPersonalization>();
    // Index by template_id first, then by task_name
    personalizations.forEach(p => {
      if (p.template_id) prefMap.set(`tid:${p.template_id}`, p);
      prefMap.set(`name:${p.task_name}`, p);
    });

    return templates.map(t => {
      const pref = prefMap.get(`tid:${t.id}`) || prefMap.get(`name:${t.name}`);
      if (!pref) return t;

      return {
        ...t,
        name: pref.custom_name || t.name,
        description: pref.custom_description || t.description,
        default_duration_days: pref.custom_duration_days || t.default_duration_days,
        advisor_specialty: pref.custom_advisor_specialty || t.advisor_specialty,
      };
    });
  }, []);

  return { getPersonalizations, saveCustomization, applyPersonalizations };
}

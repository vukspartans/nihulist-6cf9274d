import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PROJECT_PHASES } from '@/constants/project';
import { useBulkTaskCreation } from '@/hooks/useBulkTaskCreation';
import { useTaskPersonalization } from '@/hooks/useTaskPersonalization';
import type { TaskTemplate } from '@/hooks/useTaskTemplatesAdmin';

interface UseAutoTaskLoaderOptions {
  projectId: string;
  projectType: string | null;
  projectPhase: string | null;
  hasExistingTasks: boolean;
}

export function useAutoTaskLoader({
  projectId,
  projectType,
  projectPhase,
  hasExistingTasks,
}: UseAutoTaskLoaderOptions) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { createTasksFromTemplates } = useBulkTaskCreation();
  const { getPersonalizations, applyPersonalizations } = useTaskPersonalization();

  useEffect(() => {
    if (hasExistingTasks || !projectType || dismissed) {
      setTemplates([]);
      return;
    }

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        // Fetch project municipality
        const { data: project } = await supabase
          .from('projects')
          .select('municipality_id')
          .eq('id', projectId)
          .single();

        const municipalityId = project?.municipality_id;

        // Build query
        let query = supabase
          .from('task_templates')
          .select('*, municipalities(id, name), licensing_phases(id, name)')
          .eq('is_active', true)
          .eq('project_type', projectType);

        if (municipalityId) {
          // Try municipality-specific first, then fallback
          const { data: specificData } = await query.eq('municipality_id', municipalityId);
          if (specificData && specificData.length > 0) {
            const filtered = filterByPhase(specificData as TaskTemplate[], projectPhase);
            const personalizations = await getPersonalizations(projectType);
            setTemplates(applyPersonalizations(filtered, personalizations));
            setLoading(false);
            return;
          }
          // Fallback to generic (no municipality)
          query = supabase
            .from('task_templates')
            .select('*, municipalities(id, name), licensing_phases(id, name)')
            .eq('is_active', true)
            .eq('project_type', projectType)
            .is('municipality_id', null);
        } else {
          query = query.is('municipality_id', null);
        }

        const { data } = await query;
        const filtered = filterByPhase((data || []) as TaskTemplate[], projectPhase);
        const personalizations = await getPersonalizations(projectType);
        setTemplates(applyPersonalizations(filtered, personalizations));
      } catch (err) {
        console.error('Error fetching task templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [projectId, projectType, projectPhase, hasExistingTasks, dismissed]);

  const filterByPhase = (tmpls: TaskTemplate[], currentPhase: string | null): TaskTemplate[] => {
    if (!currentPhase) return tmpls;
    const phaseIndex = PROJECT_PHASES.indexOf(currentPhase as any);
    if (phaseIndex === -1) return tmpls;

    return tmpls.filter(t => {
      if (!t.licensing_phases?.name) return true; // no phase constraint
      const tPhaseIndex = PROJECT_PHASES.indexOf(t.licensing_phases.name as any);
      return tPhaseIndex === -1 || tPhaseIndex >= phaseIndex;
    });
  };

  const loadTasks = useCallback(async () => {
    if (templates.length === 0) return;
    await createTasksFromTemplates({
      projectId,
      templates,
    });
  }, [projectId, templates, createTasksFromTemplates]);

  return {
    templates,
    shouldSuggest: !hasExistingTasks && !dismissed && templates.length > 0 && !loading,
    loading,
    loadTasks,
    dismiss: () => setDismissed(true),
  };
}

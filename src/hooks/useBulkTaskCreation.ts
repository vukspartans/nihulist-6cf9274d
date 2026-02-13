import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TaskTemplate } from './useTaskTemplatesAdmin';
import { addDays, format } from 'date-fns';

interface CreateTasksOptions {
  projectId: string;
  templates: TaskTemplate[];
  startDate?: Date;
  stageId?: string;
}

interface CreatedTask {
  id: string;
  name: string;
  template_id: string;
}

/**
 * Hook for bulk creating project tasks from templates
 */
export function useBulkTaskCreation() {
  const { toast } = useToast();

  /**
   * Create multiple tasks from an array of task templates
   */
  const createTasksFromTemplates = useCallback(async ({
    projectId,
    templates,
    startDate = new Date(),
    stageId
  }: CreateTasksOptions): Promise<CreatedTask[]> => {
    if (!templates.length) {
      return [];
    }

    try {
      // Fetch project advisors with expertise for auto-assignment
      const { data: projectAdvisorsData } = await supabase
        .from('project_advisors')
        .select('advisor_id, advisors(expertise)')
        .eq('project_id', projectId)
        .eq('status', 'active');

      // Calculate dates based on template duration and order
      let currentDate = startDate;
      
      const tasksToInsert = templates.map((template, index) => {
        const plannedStart = format(currentDate, 'yyyy-MM-dd');
        const durationDays = template.default_duration_days || 7;
        const plannedEnd = format(addDays(currentDate, durationDays), 'yyyy-MM-dd');
        
        // Move current date forward for next task (sequential by default)
        currentDate = addDays(currentDate, durationDays);

        // Auto-assign advisor by matching expertise
        let assignedAdvisorId: string | null = null;
        if (template.advisor_specialty && projectAdvisorsData) {
          const match = projectAdvisorsData.find((pa: any) =>
            pa.advisors?.expertise?.includes(template.advisor_specialty)
          );
          if (match) assignedAdvisorId = match.advisor_id;
        }

        return {
          project_id: projectId,
          template_id: template.id,
          stage_id: stageId || null,
          name: template.name,
          description: template.description,
          phase: template.phase || null,
          status: 'pending' as const,
          display_order: index + 1,
          planned_start_date: plannedStart,
          planned_end_date: plannedEnd,
          duration_days: durationDays,
          is_milestone: template.is_milestone || false,
          assigned_advisor_id: assignedAdvisorId,
          notes: template.advisor_specialty && !assignedAdvisorId
            ? `יועץ נדרש: ${template.advisor_specialty}` 
            : null,
        };
      });

      const { data, error } = await supabase
        .from('project_tasks')
        .insert(tasksToInsert)
        .select('id, name, template_id');

      if (error) throw error;

      toast({
        title: "משימות נוצרו בהצלחה",
        description: `נוצרו ${data?.length || 0} משימות מתבנית`,
      });

      return (data || []) as CreatedTask[];
    } catch (error) {
      console.error('Error creating tasks from templates:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור את המשימות",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  /**
   * Create licensing stages from phases and then create tasks within them
   */
  const createStagesAndTasksFromTemplates = useCallback(async (
    projectId: string,
    templates: TaskTemplate[],
    startDate: Date = new Date()
  ) => {
    try {
      // Group templates by licensing phase
      const templatesByPhase = templates.reduce((acc, template) => {
        const phaseId = template.licensing_phase_id || 'unassigned';
        if (!acc[phaseId]) {
          acc[phaseId] = {
            phaseId: template.licensing_phase_id,
            phaseName: template.licensing_phases?.name || template.phase || 'משימות כלליות',
            templates: []
          };
        }
        acc[phaseId].templates.push(template);
        return acc;
      }, {} as Record<string, { phaseId: string | null; phaseName: string; templates: TaskTemplate[] }>);

      const phases = Object.values(templatesByPhase);
      let currentDate = startDate;
      const createdTasks: CreatedTask[] = [];

      // Create stages and tasks for each phase
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        
        // Calculate phase duration based on templates
        const phaseDuration = phase.templates.reduce(
          (sum, t) => sum + (t.default_duration_days || 7), 
          0
        );
        
        // Create the stage
        const { data: stageData, error: stageError } = await supabase
          .from('project_licensing_stages')
          .insert({
            project_id: projectId,
            licensing_phase_id: phase.phaseId,
            name: phase.phaseName,
            display_order: i + 1,
            planned_start_date: format(currentDate, 'yyyy-MM-dd'),
            planned_end_date: format(addDays(currentDate, phaseDuration), 'yyyy-MM-dd'),
            status: 'pending',
            progress_percent: 0
          })
          .select('id')
          .single();

        if (stageError) {
          console.error('Error creating stage:', stageError);
          continue;
        }

        // Create tasks for this stage
        const stageTasks = await createTasksFromTemplates({
          projectId,
          templates: phase.templates,
          startDate: currentDate,
          stageId: stageData.id
        });

        createdTasks.push(...stageTasks);
        
        // Move date forward
        currentDate = addDays(currentDate, phaseDuration);
      }

      return {
        stagesCreated: phases.length,
        tasksCreated: createdTasks
      };
    } catch (error) {
      console.error('Error creating stages and tasks:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור את השלבים והמשימות",
        variant: "destructive",
      });
      return {
        stagesCreated: 0,
        tasksCreated: []
      };
    }
  }, [createTasksFromTemplates, toast]);

  return {
    createTasksFromTemplates,
    createStagesAndTasksFromTemplates
  };
}

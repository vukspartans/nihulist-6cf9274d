import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProjectTask, TaskStatus, ProjectAdvisorOption } from '@/types/task';

export function useProjectTasks(projectId: string) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectAdvisors, setProjectAdvisors] = useState<ProjectAdvisorOption[]>([]);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          *,
          advisors:assigned_advisor_id (
            id,
            company_name
          )
        `)
        .eq('project_id', projectId)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setTasks((data || []) as ProjectTask[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את המשימות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const fetchProjectAdvisors = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('project_advisors')
        .select(`
          id,
          advisor_id,
          advisors:advisor_id (
            company_name
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'active');

      if (error) throw error;
      
      const options: ProjectAdvisorOption[] = (data || []).map((pa: any) => ({
        id: pa.id,
        advisor_id: pa.advisor_id,
        company_name: pa.advisors?.company_name || null,
      }));
      
      setProjectAdvisors(options);
    } catch (error) {
      console.error('Error fetching project advisors:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
    fetchProjectAdvisors();
  }, [fetchTasks, fetchProjectAdvisors]);

  const createTask = async (task: Partial<ProjectTask>) => {
    try {
      const maxOrder = tasks.length > 0 
        ? Math.max(...tasks.map(t => t.display_order || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: projectId,
          name: task.name || 'משימה חדשה',
          description: task.description,
          phase: task.phase,
          status: task.status || 'pending',
          display_order: maxOrder + 1,
          planned_start_date: task.planned_start_date,
          planned_end_date: task.planned_end_date,
          assigned_advisor_id: task.assigned_advisor_id,
          is_milestone: task.is_milestone,
          notes: task.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTasks();
      
      toast({
        title: "נוצר בהצלחה",
        description: "המשימה נוספה",
      });

      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור את המשימה",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({
          name: updates.name,
          description: updates.description,
          phase: updates.phase,
          status: updates.status,
          planned_start_date: updates.planned_start_date,
          planned_end_date: updates.planned_end_date,
          actual_start_date: updates.actual_start_date,
          actual_end_date: updates.actual_end_date,
          assigned_advisor_id: updates.assigned_advisor_id,
          progress_percent: updates.progress_percent,
          is_milestone: updates.is_milestone,
          is_blocked: updates.is_blocked,
          block_reason: updates.block_reason,
          notes: updates.notes,
        })
        .eq('id', taskId);

      if (error) throw error;

      // Sync planned_end_date to linked payment milestone
      if (updates.planned_end_date) {
        const task = tasks.find(t => t.id === taskId);
        if ((task as any)?.payment_milestone_id) {
          await supabase
            .from('payment_milestones')
            .update({ due_date: updates.planned_end_date })
            .eq('id', (task as any).payment_milestone_id);
        }
      }

      await fetchTasks();
      
      toast({
        title: "עודכן בהצלחה",
        description: "המשימה עודכנה",
      });

      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את המשימה",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    // Check dependencies before allowing "completed"
    if (status === 'completed') {
      const { data: deps } = await supabase
        .from('task_dependencies')
        .select(`
          id,
          blocking_task:project_tasks!task_dependencies_depends_on_task_id_fkey (
            id, name, status
          )
        `)
        .eq('task_id', taskId);

      const unfinished = (deps || []).filter(
        (d: any) => d.blocking_task && d.blocking_task.status !== 'completed' && d.blocking_task.status !== 'cancelled'
      );

      if (unfinished.length > 0) {
        const names = unfinished.map((d: any) => d.blocking_task?.name).join(', ');
        toast({
          title: "לא ניתן לסמן כ'הושלם'",
          description: `משימות תלויות שטרם הושלמו: ${names}`,
          variant: "destructive",
        });
        return false;
      }
    }

    const updates: Partial<ProjectTask> = { status };
    
    if (status === 'in_progress') {
      const task = tasks.find(t => t.id === taskId);
      if (!task?.actual_start_date) {
        updates.actual_start_date = new Date().toISOString().split('T')[0];
      }
    } else if (status === 'completed') {
      updates.actual_end_date = new Date().toISOString().split('T')[0];
      updates.progress_percent = 100;
    } else if (status === 'blocked') {
      updates.is_blocked = true;
    }
    
    if (status !== 'blocked') {
      updates.is_blocked = false;
      updates.block_reason = null;
    }

    return updateTask(taskId, updates);
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      await fetchTasks();
      
      toast({
        title: "נמחק בהצלחה",
        description: "המשימה נמחקה",
      });

      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את המשימה",
        variant: "destructive",
      });
      return false;
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  return {
    tasks,
    loading,
    projectAdvisors,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getTasksByStatus,
    refetch: fetchTasks,
  };
}

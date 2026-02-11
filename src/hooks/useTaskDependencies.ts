import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TaskDependency } from '@/types/task';

export function useTaskDependencies(taskId: string | null) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDependencies = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          blocking_task:project_tasks!task_dependencies_depends_on_task_id_fkey (
            id,
            name,
            status
          )
        `)
        .eq('task_id', taskId);

      if (error) throw error;
      setDependencies((data || []) as unknown as TaskDependency[]);

      if (error) throw error;
      setDependencies((data || []) as TaskDependency[]);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const addDependency = async (dependsOnTaskId: string, dependencyType: string = 'finish_to_start') => {
    if (!taskId) return false;
    try {
      const { error } = await supabase
        .from('task_dependencies')
        .insert({
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
          dependency_type: dependencyType,
          lag_days: 0,
        });

      if (error) throw error;
      await fetchDependencies();
      toast({ title: "נוסף בהצלחה", description: "התלות נוספה למשימה" });
      return true;
    } catch (error: any) {
      console.error('Error adding dependency:', error);
      toast({
        title: "שגיאה",
        description: error?.message?.includes('duplicate') ? "תלות זו כבר קיימת" : "לא ניתן להוסיף תלות",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeDependency = async (dependencyId: string) => {
    try {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) throw error;
      await fetchDependencies();
      toast({ title: "הוסר בהצלחה", description: "התלות הוסרה" });
      return true;
    } catch (error) {
      console.error('Error removing dependency:', error);
      toast({ title: "שגיאה", description: "לא ניתן להסיר תלות", variant: "destructive" });
      return false;
    }
  };

  const hasUnfinishedDependencies = dependencies.some(
    d => d.blocking_task && d.blocking_task.status !== 'completed' && d.blocking_task.status !== 'cancelled'
  );

  const unfinishedDependencies = dependencies.filter(
    d => d.blocking_task && d.blocking_task.status !== 'completed' && d.blocking_task.status !== 'cancelled'
  );

  return {
    dependencies,
    loading,
    addDependency,
    removeDependency,
    hasUnfinishedDependencies,
    unfinishedDependencies,
    refetch: fetchDependencies,
  };
}

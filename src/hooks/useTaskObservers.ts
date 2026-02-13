import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TaskObserver {
  id: string;
  task_id: string;
  advisor_id: string;
  added_by: string;
  created_at: string;
  company_name: string | null;
}

export function useTaskObservers(taskId: string | null) {
  const [observers, setObservers] = useState<TaskObserver[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchObservers = useCallback(async () => {
    if (!taskId) { setObservers([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_observers')
        .select('id, task_id, advisor_id, added_by, created_at, advisors:advisor_id(company_name)')
        .eq('task_id', taskId);
      if (error) throw error;
      setObservers((data || []).map((o: any) => ({
        id: o.id,
        task_id: o.task_id,
        advisor_id: o.advisor_id,
        added_by: o.added_by,
        created_at: o.created_at,
        company_name: o.advisors?.company_name || null,
      })));
    } catch (err) {
      console.error('Error fetching observers:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { fetchObservers(); }, [fetchObservers]);

  const addObserver = useCallback(async (advisorId: string) => {
    if (!taskId) return false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase
        .from('task_observers')
        .insert({ task_id: taskId, advisor_id: advisorId, added_by: user.id });
      if (error) throw error;
      toast({ title: 'מכותב נוסף', description: 'היועץ נוסף כמכותב למשימה' });
      await fetchObservers();
      return true;
    } catch (err: any) {
      if (err?.code === '23505') {
        toast({ title: 'כבר מכותב', description: 'יועץ זה כבר מכותב למשימה', variant: 'destructive' });
      } else {
        console.error('Error adding observer:', err);
        toast({ title: 'שגיאה', description: 'לא ניתן להוסיף מכותב', variant: 'destructive' });
      }
      return false;
    }
  }, [taskId, toast, fetchObservers]);

  const removeObserver = useCallback(async (advisorId: string) => {
    if (!taskId) return false;
    try {
      const { error } = await supabase
        .from('task_observers')
        .delete()
        .eq('task_id', taskId)
        .eq('advisor_id', advisorId);
      if (error) throw error;
      toast({ title: 'מכותב הוסר', description: 'היועץ הוסר מרשימת המכותבים' });
      await fetchObservers();
      return true;
    } catch (err) {
      console.error('Error removing observer:', err);
      toast({ title: 'שגיאה', description: 'לא ניתן להסיר מכותב', variant: 'destructive' });
      return false;
    }
  }, [taskId, toast, fetchObservers]);

  return { observers, loading, addObserver, removeObserver, refetch: fetchObservers };
}

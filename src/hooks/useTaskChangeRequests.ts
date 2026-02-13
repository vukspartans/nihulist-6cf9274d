import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProjectTask } from '@/types/task';

export interface TaskChangeRequest {
  id: string;
  task_id: string;
  requested_by: string;
  requested_changes: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  // joined
  task_name?: string;
  requester_name?: string;
}

export function useTaskChangeRequests(projectId: string | null) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<TaskChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      // Get tasks for this project first
      const { data: tasks } = await supabase
        .from('project_tasks')
        .select('id, name')
        .eq('project_id', projectId);

      if (!tasks || tasks.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const taskIds = tasks.map(t => t.id);
      const taskMap = new Map(tasks.map(t => [t.id, t.name]));

      const { data, error } = await supabase
        .from('task_change_requests')
        .select('*')
        .in('task_id', taskIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get requester names
      const requesterIds = [...new Set((data || []).map(r => r.requested_by))];
      let nameMap = new Map<string, string>();
      if (requesterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', requesterIds);
        (profiles || []).forEach(p => nameMap.set(p.user_id, p.name || 'לא ידוע'));
      }

      setRequests((data || []).map(r => ({
        ...r,
        requested_changes: r.requested_changes as Record<string, any>,
        status: r.status as 'pending' | 'approved' | 'rejected',
        task_name: taskMap.get(r.task_id) || '',
        requester_name: nameMap.get(r.requested_by) || 'לא ידוע',
      })));
    } catch (err) {
      console.error('Error fetching change requests:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const submitChangeRequest = async (taskId: string, changes: Partial<ProjectTask>, userId: string) => {
    try {
      const { error } = await supabase
        .from('task_change_requests')
        .insert({
          task_id: taskId,
          requested_by: userId,
          requested_changes: changes as any,
        });

      if (error) throw error;

      toast({
        title: 'נשלח לאישור',
        description: 'השינויים נשלחו לאישור היזם',
      });

      await fetchRequests();
      return true;
    } catch (err) {
      console.error('Error submitting change request:', err);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח את הבקשה',
        variant: 'destructive',
      });
      return false;
    }
  };

  const reviewChangeRequest = async (
    requestId: string,
    decision: 'approved' | 'rejected',
    reviewerId: string,
    note?: string
  ) => {
    try {
      const { error } = await supabase
        .from('task_change_requests')
        .update({
          status: decision,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_note: note || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      // If approved, apply the changes to the task
      if (decision === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          const { error: taskError } = await supabase
            .from('project_tasks')
            .update(request.requested_changes)
            .eq('id', request.task_id);

          if (taskError) throw taskError;
        }
      }

      toast({
        title: decision === 'approved' ? 'אושר' : 'נדחה',
        description: decision === 'approved' ? 'השינויים אושרו והוחלו' : 'הבקשה נדחתה',
      });

      await fetchRequests();
      return true;
    } catch (err) {
      console.error('Error reviewing change request:', err);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן את הבקשה',
        variant: 'destructive',
      });
      return false;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return {
    requests,
    loading,
    pendingCount,
    submitChangeRequest,
    reviewChangeRequest,
    refetch: fetchRequests,
  };
}

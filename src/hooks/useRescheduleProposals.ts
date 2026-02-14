import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProposedChange {
  task_id: string;
  task_name: string;
  old_start: string | null;
  new_start: string | null;
  old_end: string | null;
  new_end: string | null;
}

export interface RescheduleProposal {
  id: string;
  project_id: string;
  trigger_task_id: string;
  proposed_changes: ProposedChange[];
  status: string;
  delay_days: number;
  created_at: string;
  trigger_task_name?: string;
}

/**
 * Applies date changes for a list of tasks and syncs linked payment milestones.
 * Uses Promise.all for concurrent updates instead of sequential N+1 queries.
 */
async function batchApplyChanges(changes: ProposedChange[]): Promise<void> {
  // 1. Batch-update all task dates concurrently
  const taskUpdates = changes
    .filter(c => c.new_start || c.new_end)
    .map(c => {
      const updates: Record<string, string> = {};
      if (c.new_start) updates.planned_start_date = c.new_start;
      if (c.new_end) updates.planned_end_date = c.new_end;
      return supabase.from('project_tasks').update(updates).eq('id', c.task_id);
    });

  const results = await Promise.all(taskUpdates);
  const firstError = results.find(r => r.error);
  if (firstError?.error) throw firstError.error;

  // 2. Sync payment milestones for tasks with new end dates
  const taskIdsWithNewEnd = changes.filter(c => c.new_end).map(c => c.task_id);
  if (taskIdsWithNewEnd.length === 0) return;

  const { data: linkedTasks } = await supabase
    .from('project_tasks')
    .select('id, payment_milestone_id, planned_end_date')
    .in('id', taskIdsWithNewEnd)
    .not('payment_milestone_id', 'is', null);

  if (linkedTasks && linkedTasks.length > 0) {
    const milestoneUpdates = linkedTasks.map(t =>
      supabase
        .from('payment_milestones')
        .update({ due_date: t.planned_end_date })
        .eq('id', t.payment_milestone_id!)
    );
    await Promise.all(milestoneUpdates);
  }
}

export function useRescheduleProposals(projectIds: string[]) {
  const [proposals, setProposals] = useState<RescheduleProposal[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable key for dependency tracking
  const projectKey = projectIds.join(',');

  const fetchProposals = useCallback(async () => {
    if (projectIds.length === 0) {
      setProposals([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('reschedule_proposals')
      .select('*, project_tasks!reschedule_proposals_trigger_task_id_fkey(name)')
      .in('project_id', projectIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reschedule proposals:', error);
    } else {
      setProposals(
        (data || []).map((row: any) => ({
          id: row.id,
          project_id: row.project_id,
          trigger_task_id: row.trigger_task_id,
          proposed_changes: (row.proposed_changes || []) as ProposedChange[],
          status: row.status,
          delay_days: row.delay_days,
          created_at: row.created_at,
          trigger_task_name: row.project_tasks?.name || 'משימה',
        }))
      );
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const acceptProposal = useCallback(async (
    proposalId: string,
    changes: ProposedChange[],
    onSuccess?: () => void,
  ) => {
    try {
      await batchApplyChanges(changes);

      // Mark proposal as accepted
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase
        .from('reschedule_proposals')
        .update({
          status: 'accepted',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq('id', proposalId);

      toast.success('לוח הזמנים עודכן בהצלחה');
      await fetchProposals();
      onSuccess?.();
    } catch (err) {
      console.error('Error accepting reschedule proposal:', err);
      toast.error('שגיאה בעדכון לוח הזמנים');
    }
  }, [fetchProposals]);

  const dismissProposal = useCallback(async (proposalId: string) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase
        .from('reschedule_proposals')
        .update({
          status: 'dismissed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq('id', proposalId);

      toast.success('ההצעה נדחתה');
      await fetchProposals();
    } catch (err) {
      console.error('Error dismissing proposal:', err);
      toast.error('שגיאה בדחיית ההצעה');
    }
  }, [fetchProposals]);

  return { proposals, loading, acceptProposal, dismissProposal, refetch: fetchProposals };
}

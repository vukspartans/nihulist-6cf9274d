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

export function useRescheduleProposals(projectIds: string[]) {
  const [proposals, setProposals] = useState<RescheduleProposal[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [projectIds.join(',')]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const acceptProposal = useCallback(async (
    proposalId: string,
    changes: ProposedChange[],
    onSuccess?: () => void,
  ) => {
    try {
      // Batch update all affected tasks
      for (const change of changes) {
        const updates: Record<string, any> = {};
        if (change.new_start) updates.planned_start_date = change.new_start;
        if (change.new_end) updates.planned_end_date = change.new_end;

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('project_tasks')
            .update(updates)
            .eq('id', change.task_id);
          if (error) throw error;

          // Sync payment milestone if linked
          if (change.new_end) {
            const { data: task } = await supabase
              .from('project_tasks')
              .select('payment_milestone_id')
              .eq('id', change.task_id)
              .single();
            if (task?.payment_milestone_id) {
              await supabase
                .from('payment_milestones')
                .update({ due_date: change.new_end })
                .eq('id', task.payment_milestone_id);
            }
          }
        }
      }

      // Mark proposal as accepted
      await supabase
        .from('reschedule_proposals')
        .update({
          status: 'accepted',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
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
      await supabase
        .from('reschedule_proposals')
        .update({
          status: 'dismissed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
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

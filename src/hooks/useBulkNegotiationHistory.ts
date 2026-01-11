import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BulkBatch {
  id: string;
  project_id: string;
  initiator_id: string;
  reduction_type: 'percent' | 'fixed';
  reduction_value: number;
  message: string | null;
  created_at: string;
  member_count?: number;
}

export interface BulkMember {
  id: string;
  batch_id: string;
  proposal_id: string;
  session_id: string | null;
  created_at: string;
}

export interface BulkNegotiationHistoryResult {
  batches: BulkBatch[];
  proposalsInBatches: Set<string>;
  newProposals: string[];
  lastBatch: BulkBatch | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createBatch: (data: {
    projectId: string;
    reductionType: 'percent' | 'fixed';
    reductionValue: number;
    message?: string;
    proposalIds: string[];
    sessionIds?: Record<string, string>;
  }) => Promise<string | null>;
}

export const useBulkNegotiationHistory = (projectId: string | undefined): BulkNegotiationHistoryResult => {
  const [batches, setBatches] = useState<BulkBatch[]>([]);
  const [proposalsInBatches, setProposalsInBatches] = useState<Set<string>>(new Set());
  const [newProposals, setNewProposals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all batches for this project
      const { data: batchesData, error: batchesError } = await supabase
        .from('bulk_negotiation_batches')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (batchesError) throw batchesError;

      // Fetch all members for these batches
      const batchIds = (batchesData || []).map(b => b.id);
      let membersData: BulkMember[] = [];
      
      if (batchIds.length > 0) {
        const { data: members, error: membersError } = await supabase
          .from('bulk_negotiation_members')
          .select('*')
          .in('batch_id', batchIds);

        if (membersError) throw membersError;
        membersData = members || [];
      }

      // Calculate member counts per batch
      const memberCounts = membersData.reduce((acc, m) => {
        acc[m.batch_id] = (acc[m.batch_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const batchesWithCounts = (batchesData || []).map(b => ({
        ...b,
        reduction_type: b.reduction_type as 'percent' | 'fixed',
        member_count: memberCounts[b.id] || 0
      }));

      // Get all proposal IDs that were ever in a batch
      const proposalIdsInBatches = new Set(membersData.map(m => m.proposal_id));

      // Fetch all proposals for this project to find "new" ones
      const { data: allProposals, error: proposalsError } = await supabase
        .from('proposals')
        .select('id, submitted_at')
        .eq('project_id', projectId)
        .in('status', ['submitted', 'resubmitted']);

      if (proposalsError) throw proposalsError;

      // Find proposals submitted after the last batch
      const lastBatchDate = batchesWithCounts[0]?.created_at;
      const newProposalIds = (allProposals || [])
        .filter(p => {
          // If no batches exist, all proposals are "new"
          if (!lastBatchDate) return !proposalIdsInBatches.has(p.id);
          // Otherwise, proposals submitted after last batch AND not in any batch
          return !proposalIdsInBatches.has(p.id) && new Date(p.submitted_at) > new Date(lastBatchDate);
        })
        .map(p => p.id);

      setBatches(batchesWithCounts);
      setProposalsInBatches(proposalIdsInBatches);
      setNewProposals(newProposalIds);
    } catch (err) {
      console.error('Error fetching bulk negotiation history:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת היסטוריית בקשות');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createBatch = useCallback(async (data: {
    projectId: string;
    reductionType: 'percent' | 'fixed';
    reductionValue: number;
    message?: string;
    proposalIds: string[];
    sessionIds?: Record<string, string>;
  }): Promise<string | null> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the batch
      const { data: batch, error: batchError } = await supabase
        .from('bulk_negotiation_batches')
        .insert({
          project_id: data.projectId,
          initiator_id: user.id,
          reduction_type: data.reductionType,
          reduction_value: data.reductionValue,
          message: data.message || null
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create members for each proposal
      const members = data.proposalIds.map(proposalId => ({
        batch_id: batch.id,
        proposal_id: proposalId,
        session_id: data.sessionIds?.[proposalId] || null
      }));

      const { error: membersError } = await supabase
        .from('bulk_negotiation_members')
        .insert(members);

      if (membersError) throw membersError;

      // Refetch to update state
      await fetchHistory();

      return batch.id;
    } catch (err) {
      console.error('Error creating bulk batch:', err);
      toast.error('שגיאה ביצירת בקשה מרוכזת');
      return null;
    }
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    batches,
    proposalsInBatches,
    newProposals,
    lastBatch: batches[0] || null,
    loading,
    error,
    refetch: fetchHistory,
    createBatch
  };
};


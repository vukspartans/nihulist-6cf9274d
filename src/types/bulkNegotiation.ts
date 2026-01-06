// Bulk Negotiation Types

export interface BulkNegotiationBatch {
  id: string;
  project_id: string;
  initiator_id: string;
  reduction_type: 'percent' | 'fixed';
  reduction_value: number;
  message: string | null;
  created_at: string;
  member_count?: number;
}

export interface BulkNegotiationMember {
  id: string;
  batch_id: string;
  proposal_id: string;
  session_id: string | null;
  created_at: string;
}

export interface CreateBulkBatchInput {
  projectId: string;
  reductionType: 'percent' | 'fixed';
  reductionValue: number;
  message?: string;
  proposalIds: string[];
  sessionIds?: Record<string, string>;
}

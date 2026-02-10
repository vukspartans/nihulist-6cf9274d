export interface PaymentMilestone {
  id: string;
  project_id: string;
  project_advisor_id: string | null;
  task_id: string | null;
  name: string;
  amount: number;
  percentage_of_total: number | null;
  currency: string;
  trigger_type: string;
  due_date: string | null;
  status: 'pending' | 'due' | 'paid' | 'overdue';
  display_order: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  project_advisor?: {
    id: string;
    advisor_id: string;
    fee_amount: number;
    advisors?: {
      id: string;
      company_name: string | null;
      logo_url: string | null;
    };
  };
}

export interface PaymentRequest {
  id: string;
  project_id: string;
  project_advisor_id: string | null;
  payment_milestone_id: string | null;
  request_number: string | null;
  amount: number;
  vat_percent: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  currency: string;
  category: 'consultant' | 'external' | 'other';
  source_type: string;
  status: 'prepared' | 'submitted' | 'approved' | 'paid' | 'rejected';
  invoice_file_url: string | null;
  attachments: any[];
  notes: string | null;
  external_party_name: string | null;
  external_party_id: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approver_signature_id: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  // Index adjustment fields
  index_type: string | null;
  index_base_value: number | null;
  index_current_value: number | null;
  index_adjustment_factor: number | null;
  index_adjusted_amount: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  project_advisor?: {
    id: string;
    advisor_id: string;
    advisors?: {
      id: string;
      company_name: string | null;
      logo_url: string | null;
    };
  };
  payment_milestone?: {
    id: string;
    name: string;
  };
}

export interface PaymentSummary {
  totalBudget: number;
  totalPaid: number;
  totalPending: number;
  totalRemaining: number;
}

export type PaymentMilestoneStatus = 'pending' | 'due' | 'paid' | 'overdue';
export type PaymentRequestStatus = 'prepared' | 'submitted' | 'approved' | 'paid' | 'rejected';

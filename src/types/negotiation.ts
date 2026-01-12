// Negotiation Module Types

export type NegotiationStatus = 'open' | 'awaiting_response' | 'responded' | 'resolved' | 'cancelled';

export type AdjustmentType = 'price_change' | 'flat_discount' | 'percentage_discount';

export type CommentType = 'document' | 'scope' | 'milestone' | 'payment' | 'general';

export type AuthorType = 'initiator' | 'consultant';

export interface ProposalVersion {
  id: string;
  proposal_id: string;
  version_number: number;
  price: number;
  timeline_days: number;
  scope_text?: string;
  terms?: string;
  conditions_json?: Record<string, unknown>;
  line_items?: ProposalLineItem[];
  created_at: string;
  created_by?: string;
  change_reason?: string;
}

export interface ProposalLineItem {
  id: string;
  proposal_id: string;
  proposal_version_id?: string;
  version_number: number;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total: number;
  is_optional: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface NegotiationSession {
  id: string;
  proposal_id: string;
  project_id: string;
  negotiated_version_id?: string;
  initiator_id: string;
  consultant_advisor_id: string;
  status: NegotiationStatus;
  target_total?: number;
  target_reduction_percent?: number;
  global_comment?: string;
  initiator_message?: string;
  consultant_response_message?: string;
  responded_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // JSONB fields from database - typed as unknown for flexibility with Json type
  files?: unknown;
  milestone_adjustments?: unknown;
}

export interface LineItemNegotiation {
  id: string;
  session_id: string;
  line_item_id: string;
  adjustment_type: AdjustmentType;
  original_price: number;
  adjustment_value: number;
  initiator_target_price: number;
  consultant_response_price?: number;
  final_price?: number;
  initiator_note?: string;
  consultant_note?: string;
  created_at: string;
  updated_at: string;
}

export interface NegotiationComment {
  id: string;
  session_id: string;
  author_id: string;
  author_type: AuthorType;
  comment_type: CommentType;
  entity_reference?: string;
  content: string;
  created_at: string;
}

// Input types for edge functions
export interface MilestoneAdjustmentInput {
  milestone_id: string;
  original_percentage: number;
  target_percentage: number;
  initiator_note?: string;
}

export interface NegotiationRequestInput {
  project_id: string;
  proposal_id: string;
  negotiated_version_id?: string | null;  // Optional - edge function creates if not provided
  target_total?: number;
  target_reduction_percent?: number;
  global_comment?: string;
  bulk_message?: string;
  line_item_adjustments?: LineItemAdjustment[];
  milestone_adjustments?: MilestoneAdjustmentInput[];
  comments?: NegotiationCommentInput[];
  files?: { name: string; url: string; size: number }[];
}

export interface LineItemAdjustment {
  line_item_id: string;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  initiator_note?: string;
}

export interface NegotiationCommentInput {
  comment_type: CommentType;
  content: string;
  entity_reference?: string;
}

export interface NegotiationResponseInput {
  session_id: string;
  consultant_message?: string;
  updated_line_items: UpdatedLineItem[];
}

export interface UpdatedLineItem {
  line_item_id: string;
  consultant_response_price: number;
  consultant_note?: string;
}

export interface NegotiationRequestOutput {
  session_id: string;
  created_at: string;
}

export interface NegotiationResponseOutput {
  new_version_id: string;
  new_version_number: number;
}

// Fee line item from proposal JSON
export interface FeeLineItem {
  item_id?: string;
  item_number?: number;
  description: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  comment?: string;
  is_entrepreneur_defined?: boolean;
  is_optional?: boolean;
}

// Milestone from proposal JSON
export interface ProposalMilestone {
  description: string;
  percentage: number;
  is_entrepreneur_defined?: boolean;
}

// JSON line item adjustment stored in session.files
export interface JsonLineItemAdjustment {
  line_item_id: string;
  original_unit_price: number;
  target_unit_price: number;
  quantity: number;
  original_total: number;
  target_total: number;
  initiator_note?: string;
}

// Initiator profile info
export interface InitiatorProfile {
  name: string | null;
  company_name: string | null;
  organization_id?: string | null;
}

// Extended types with relations
export interface NegotiationSessionWithDetails extends NegotiationSession {
  proposal?: {
    id: string;
    price: number;
    supplier_name: string;
    current_version: number;
    advisor_id: string;
    fee_line_items?: FeeLineItem[];
    milestone_adjustments?: ProposalMilestone[];
  };
  project?: {
    id: string;
    name: string;
    owner_id: string;
  };
  advisor?: {
    id: string;
    company_name: string;
    user_id: string;
  };
  initiator_profile?: InitiatorProfile;
  line_item_negotiations?: LineItemNegotiation[];
  comments?: NegotiationComment[];
}

export interface ProposalWithNegotiation {
  id: string;
  price: number;
  timeline_days: number;
  status: string;
  supplier_name: string;
  current_version: number;
  has_active_negotiation: boolean;
  negotiation_count: number;
  advisor_id: string;
  project_id: string;
  submitted_at: string;
  advisor?: {
    id: string;
    company_name: string;
    logo_url?: string;
    rating?: number;
    user_id: string;
  };
  active_negotiation?: NegotiationSession;
  versions?: ProposalVersion[];
  line_items?: ProposalLineItem[];
}

// =============================================
// Types for Hierarchical Fee Templates System
// =============================================

export interface FeeTemplateCategory {
  id: string;
  name: string;
  advisor_specialty: string;
  project_type: string | null;
  is_default: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeSubmissionMethod {
  id: string;
  category_id: string;
  method_type: 'lump_sum' | 'quantity' | 'hourly';
  method_label: string;
  is_default: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface FeeItemTemplateExtended {
  id: string;
  advisor_specialty: string;
  project_type: string | null;
  category_id: string | null;
  submission_method_id: string | null;
  description: string;
  unit: string;
  default_quantity: number | null;
  charge_type: string | null;
  is_optional: boolean;
  display_order: number;
  is_user_template: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Input types for mutations
export interface CreateFeeCategoryInput {
  name: string;
  advisor_specialty: string;
  project_type?: string | null;
  is_default?: boolean;
  display_order?: number;
}

export interface UpdateFeeCategoryInput extends Partial<CreateFeeCategoryInput> {
  id: string;
}

export interface CreateSubmissionMethodInput {
  category_id: string;
  method_type: 'lump_sum' | 'quantity' | 'hourly';
  method_label: string;
  is_default?: boolean;
  display_order?: number;
}

export interface UpdateSubmissionMethodInput extends Partial<CreateSubmissionMethodInput> {
  id: string;
}

export interface CreateFeeItemInput {
  advisor_specialty: string;
  description: string;
  unit: string;
  project_type?: string | null;
  category_id?: string | null;
  submission_method_id?: string | null;
  default_quantity?: number;
  charge_type?: string;
  is_optional?: boolean;
  display_order?: number;
  is_user_template?: boolean;
}

// Aggregation types for hierarchy views
export interface AdvisorTypeSummary {
  advisor_specialty: string;
  category_count: number;
  template_count: number;
}

export interface ProjectTypeSummary {
  project_type: string;
  category_count: number;
}

// Method type labels mapping
export const METHOD_TYPE_LABELS: Record<string, string> = {
  lump_sum: 'פאושלי',
  quantity: 'כמותי',
  hourly: 'שעתי',
};

export const METHOD_TYPES = ['lump_sum', 'quantity', 'hourly'] as const;

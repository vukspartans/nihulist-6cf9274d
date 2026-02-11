// RFP Request Types for the enhanced Request Editor Dialog

export type FeeUnit = 
  | 'lump_sum'    // קומפ'
  | 'sqm'         // מ"ר
  | 'unit'        // יח"ד
  | 'hourly'      // ש"ע
  | 'per_consultant' // לי"ע
  | 'per_floor'   // לקומה
  | 'percentage'; // %

export type ChargeType = 
  | 'one_time'    // חד פעמי
  | 'monthly'     // חודשי
  | 'hourly'      // לש"ע
  | 'per_visit'   // לביקור
  | 'per_unit';   // ליח"ד

export type ServiceDetailsMode = 'free_text' | 'file' | 'checklist';

export type DurationUnit = 'months' | 'hours' | 'visits' | 'units';

export interface RFPFeeItem {
  id?: string;
  item_number: number;
  description: string;
  unit: FeeUnit;
  quantity: number;
  unit_price?: number;
  charge_type: ChargeType;
  is_optional: boolean;
  display_order: number;
  // Recurring payment fields
  duration?: number;          // Number of periods (months/hours/visits)
  duration_unit?: DurationUnit;
}

export interface ServiceScopeItem {
  id?: string;
  task_name: string;
  is_included: boolean;
  fee_category: string;
  is_optional: boolean;
  display_order: number;
}

export interface MilestonePayment {
  description: string;
  percentage: number;
  trigger?: string; // e.g., "עם קבלת היתר", "עם סיום התכנון"
}

export type PaymentTermType = 
  | 'immediate'  // תשלום מיידי
  | 'current'    // שוטף
  | 'net_15'     // שוטף + 15
  | 'net_30'     // שוטף + 30
  | 'net_45'     // שוטף + 45
  | 'net_60'     // שוטף + 60
  | 'net_75'     // שוטף + 75
  | 'net_90'     // שוטף + 90
  | 'net_120';   // שוטף + 120

export type IndexType = 'none' | 'cpi' | 'construction_wage' | 'hourly_labor_cost' | 
                        'residential_construction_input' | 'non_residential_construction_input';

export interface PaymentTerms {
  advance_percent?: number;
  milestone_payments?: MilestonePayment[];
  payment_term_type?: PaymentTermType;
  payment_due_days?: number; // Kept for backward compatibility
  notes?: string;
  // Index (מדד) fields
  index_type?: IndexType;
  index_base_value?: number;
  index_base_month?: string; // e.g., "2024-01"
}

export interface UploadedFileMetadata {
  name: string;
  url: string;
  size: number;
  path: string;
}

// Extended interface for the new tabbed editor
export interface AdvisorTypeRequestData {
  // Main tab
  requestTitle: string;
  requestContent: string;
  requestAttachments: UploadedFileMetadata[];
  hasBeenReviewed: boolean;
  lastEditedAt?: Date;
  
  // Service Details - mode selection
  serviceDetailsMode: ServiceDetailsMode;
  serviceDetailsFreeText?: string;
  serviceDetailsFile?: UploadedFileMetadata;
  serviceScopeItems?: ServiceScopeItem[];
  selectedCategoryId?: string;
  selectedCategoryName?: string;
  selectedMethodId?: string;
  selectedMethodLabel?: string;
  
  // Fee items (שכר טרחה)
  feeItems: RFPFeeItem[];
  optionalFeeItems: RFPFeeItem[];
  
  // Payment terms (תשלום)
  paymentTerms?: PaymentTerms;
  
  // Legacy fields (kept for backward compatibility)
  emailSubject?: string;
  emailBody?: string;
}


// Default service scope template interface
export interface DefaultServiceScopeTemplate {
  id?: string;
  advisor_specialty: string;
  task_name: string;
  default_fee_category: string;
  is_optional: boolean;
  display_order: number;
}

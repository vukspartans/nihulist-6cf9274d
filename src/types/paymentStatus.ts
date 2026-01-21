export interface PaymentStatusDefinition {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  color: string;
  icon: string | null;
  is_system: boolean;
  is_terminal: boolean;
  is_active: boolean;
  display_order: number;
  notify_on_enter: boolean;
  notify_roles: string[];
  email_template_key: string | null;
  requires_signature: boolean;
  signature_type: SignatureType;
  created_at: string;
  updated_at: string;
}

export interface OrganizationApprovalChain {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  after_status_code: string;
  approver_role: string | null;
  approver_user_id: string | null;
  display_order: number;
  is_active: boolean;
  notify_on_enter: boolean;
  notify_email: string | null;
  requires_signature: boolean;
  signature_type: string;
  created_at: string;
  updated_at: string;
}

export type SignatureType = 'none' | 'checkbox' | 'drawn' | 'uploaded';
export type NotifyRole = 'entrepreneur' | 'consultant' | 'accountant' | 'approver';

export interface CreatePaymentStatusInput {
  code: string;
  name: string;
  name_en?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_terminal?: boolean;
  is_active?: boolean;
  display_order?: number;
  notify_on_enter?: boolean;
  notify_roles?: string[];
  requires_signature?: boolean;
  signature_type?: SignatureType;
}

export interface UpdatePaymentStatusInput extends Partial<Omit<CreatePaymentStatusInput, 'code'>> {
  id: string;
}

// Constants for UI
export const SIGNATURE_TYPES: { value: SignatureType; label: string }[] = [
  { value: 'none', label: 'ללא' },
  { value: 'checkbox', label: 'אישור בסימון' },
  { value: 'drawn', label: 'חתימה ידנית' },
  { value: 'uploaded', label: 'העלאת חתימה' },
];

export const NOTIFY_ROLES: { value: NotifyRole; label: string }[] = [
  { value: 'entrepreneur', label: 'יזם' },
  { value: 'consultant', label: 'יועץ' },
  { value: 'accountant', label: 'הנהלת חשבונות' },
  { value: 'approver', label: 'מאשר הבא בתור' },
];

export const STATUS_COLORS = [
  { value: '#6B7280', label: 'אפור (טיוטה)' },
  { value: '#3B82F6', label: 'כחול (הוגש)' },
  { value: '#8B5CF6', label: 'סגול (בבדיקה)' },
  { value: '#10B981', label: 'ירוק כהה (אושר)' },
  { value: '#22C55E', label: 'ירוק (שולם)' },
  { value: '#F59E0B', label: 'כתום (ממתין)' },
  { value: '#EF4444', label: 'אדום (נדחה)' },
];

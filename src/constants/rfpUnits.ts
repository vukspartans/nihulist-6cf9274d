// Fee units and charge types for RFP request editor

export const FEE_UNITS = [
  { value: 'lump_sum', label: "קומפ'" },
  { value: 'sqm', label: 'מ"ר' },
  { value: 'unit', label: 'יח"ד' },
  { value: 'hourly', label: 'ש"ע' },
  { value: 'per_consultant', label: 'לי"ע' },
  { value: 'per_floor', label: 'לקומה' },
  { value: 'percentage', label: '%' },
] as const;

export const CHARGE_TYPES = [
  { value: 'one_time', label: 'חד פעמי' },
  { value: 'monthly', label: 'חודשי' },
  { value: 'hourly', label: 'לש"ע' },
  { value: 'per_visit', label: 'לביקור' },
  { value: 'per_unit', label: 'ליח"ד' },
] as const;

export const DEFAULT_FEE_CATEGORIES = [
  'כללי',
  'חוו"ד ראשונית',
  'הכנת נספח תנועה',
  'פגישות במשרדי היזם',
  'ליווי מול רשויות',
  'תכנון ראשוני',
  'תכנון מפורט',
] as const;

export const PAYMENT_MILESTONES_TEMPLATES = [
  { trigger: 'מקדמה בחתימה', default_percent: 20 },
  { trigger: 'עם קבלת היתר', default_percent: 30 },
  { trigger: 'עם סיום התכנון', default_percent: 30 },
  { trigger: 'עם מסירת העבודה', default_percent: 20 },
] as const;

// Helper to get label from value
export const getFeeUnitLabel = (value: string): string => {
  return FEE_UNITS.find(u => u.value === value)?.label || value;
};

export const getChargeTypeLabel = (value: string): string => {
  return CHARGE_TYPES.find(c => c.value === value)?.label || value;
};

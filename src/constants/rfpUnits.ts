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

// Duration unit labels for recurring payments
export const DURATION_UNIT_LABELS: Record<string, string> = {
  months: 'חודשים',
  hours: 'שעות',
  visits: 'ביקורים',
  units: 'יחידות',
};

// Map charge_type to default duration_unit
export const CHARGE_TYPE_TO_DURATION_UNIT: Record<string, string | null> = {
  one_time: null,           // No duration needed
  monthly: 'months',        // Duration in months
  hourly: 'hours',          // Duration in hours
  per_visit: 'visits',      // Duration in visits
  per_unit: 'units',        // Duration in units
};

// Default duration values when charge_type changes
export const DEFAULT_DURATIONS: Record<string, number> = {
  monthly: 12,    // 12 months by default
  hourly: 1,      // 1 hour by default
  per_visit: 1,   // 1 visit by default
  per_unit: 1,    // 1 unit by default
};

// Helper to get label from value
export const getFeeUnitLabel = (value: string): string => {
  return FEE_UNITS.find(u => u.value === value)?.label || value;
};

export const getChargeTypeLabel = (value: string): string => {
  return CHARGE_TYPES.find(c => c.value === value)?.label || value;
};

// Get duration unit label based on charge type
export const getDurationUnitLabel = (chargeType: string): string => {
  const durationUnit = CHARGE_TYPE_TO_DURATION_UNIT[chargeType];
  if (!durationUnit) return '';
  return DURATION_UNIT_LABELS[durationUnit] || '';
};

// Check if a charge type requires duration input
export const isRecurringChargeType = (chargeType: string): boolean => {
  return chargeType !== 'one_time' && CHARGE_TYPE_TO_DURATION_UNIT[chargeType] !== null;
};

// Calculate total including duration for recurring items
export const calculateFeeItemTotal = (
  unitPrice: number | undefined | null,
  quantity: number | undefined | null,
  chargeType: string,
  duration: number | undefined | null
): number => {
  const price = unitPrice ?? 0;
  const qty = quantity ?? 1;
  const dur = isRecurringChargeType(chargeType) ? (duration ?? 1) : 1;
  return price * qty * dur;
};

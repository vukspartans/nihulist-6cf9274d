/**
 * Centralized Payment Terms Constants
 * 
 * All payment term types and helper functions used across the system.
 * Ensures consistency in labels and values for both Hebrew and English displays.
 */

export const PAYMENT_TERM_TYPES = [
  { value: 'immediate', label: 'תשלום מיידי', labelEn: 'Immediate Payment' },
  { value: 'current', label: 'שוטף', labelEn: 'Current' },
  { value: 'net_15', label: 'שוטף + 15', labelEn: 'Net 15' },
  { value: 'net_30', label: 'שוטף + 30', labelEn: 'Net 30' },
  { value: 'net_45', label: 'שוטף + 45', labelEn: 'Net 45' },
  { value: 'net_60', label: 'שוטף + 60', labelEn: 'Net 60' },
  { value: 'net_75', label: 'שוטף + 75', labelEn: 'Net 75' },
  { value: 'net_90', label: 'שוטף + 90', labelEn: 'Net 90' },
  { value: 'net_120', label: 'שוטף + 120', labelEn: 'Net 120' },
] as const;

export type PaymentTermType = typeof PAYMENT_TERM_TYPES[number]['value'];

export const DEFAULT_PAYMENT_TERM: PaymentTermType = 'net_30';

/**
 * Get Hebrew label for a payment term value
 * @param value - The payment term value (e.g., 'net_30')
 * @returns Hebrew label (e.g., 'שוטף + 30') or fallback
 */
export const getPaymentTermLabel = (value: string | null | undefined): string => {
  if (!value) return 'לא צוין';
  const term = PAYMENT_TERM_TYPES.find(t => t.value === value);
  return term?.label || value;
};

/**
 * Get English label for a payment term value
 * @param value - The payment term value (e.g., 'net_30')
 * @returns English label (e.g., 'Net 30') or fallback
 */
export const getPaymentTermLabelEn = (value: string | null | undefined): string => {
  if (!value) return 'Not specified';
  const term = PAYMENT_TERM_TYPES.find(t => t.value === value);
  return term?.labelEn || value;
};

/**
 * Legacy mapping for backward compatibility
 * Use getPaymentTermLabel instead for new code
 */
export const PAYMENT_TERM_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_TERM_TYPES.map(t => [t.value, t.label])
);

// Index types for price linkage in fee template categories
export const INDEX_TYPES = [
  { value: 'none', label: 'ללא הצמדה' },
  { value: 'cpi', label: 'מדד המחירים לצרכן' },
  { value: 'construction_wage', label: 'מדד שכר העבודה בענף הבנייה' },
  { value: 'hourly_labor_cost', label: 'מדד עלות שעת עבודה' },
  { value: 'residential_construction_input', label: 'מדד תשומות הבנייה למגורים' },
  { value: 'non_residential_construction_input', label: 'מדד תשומות הבנייה שלא למגורים' },
] as const;

export type IndexType = typeof INDEX_TYPES[number]['value'];

export const DEFAULT_INDEX_TYPE: IndexType = 'cpi';

// Helper function to get index label by value
export const getIndexLabel = (value: string | null | undefined): string => {
  const indexType = INDEX_TYPES.find(t => t.value === value);
  return indexType?.label || 'מדד המחירים לצרכן';
};

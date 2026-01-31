-- Add index_type column to fee_template_categories
ALTER TABLE public.fee_template_categories
  ADD COLUMN IF NOT EXISTS default_index_type TEXT DEFAULT 'cpi';

-- Add constraint for valid index types
ALTER TABLE public.fee_template_categories
  ADD CONSTRAINT valid_index_type CHECK (
    default_index_type IN (
      'none',
      'cpi',
      'construction_wage',
      'hourly_labor_cost',
      'residential_construction_input',
      'non_residential_construction_input'
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN public.fee_template_categories.default_index_type IS 
  'Default index type for price linkage: none, cpi, construction_wage, hourly_labor_cost, residential_construction_input, non_residential_construction_input';
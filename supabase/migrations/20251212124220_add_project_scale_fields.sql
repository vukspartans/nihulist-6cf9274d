-- Add units column (nullable - optional for MVP) for large scale detection
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS units INTEGER,
  ADD COLUMN IF NOT EXISTS is_large_scale BOOLEAN GENERATED ALWAYS AS (
    (units IS NOT NULL AND units > 40) OR 
    (advisors_budget IS NOT NULL AND advisors_budget > 1000000)
  ) STORED;

-- Add index
CREATE INDEX IF NOT EXISTS idx_projects_large_scale 
  ON public.projects(is_large_scale) 
  WHERE is_large_scale = true;

COMMENT ON COLUMN public.projects.units IS 
  'Number of units (apartments/offices) in project. Used for large scale classification. NULL = not specified.';
COMMENT ON COLUMN public.projects.is_large_scale IS 
  'Computed: true if units > 40 OR advisors_budget > 1M ILS. Works with just advisors_budget if units is NULL.';



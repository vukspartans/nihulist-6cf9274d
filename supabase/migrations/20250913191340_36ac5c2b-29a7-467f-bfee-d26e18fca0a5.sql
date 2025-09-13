-- Create mapping function to convert legacy project types to new types
CREATE OR REPLACE FUNCTION public.normalize_project_type(legacy_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Handle null or empty types
  IF legacy_type IS NULL OR trim(legacy_type) = '' THEN
    RETURN 'מגורים בבנייה רוויה (5–8 קומות)'; -- Default fallback
  END IF;

  -- Convert legacy types to new standardized types
  CASE 
    WHEN legacy_type ILIKE '%בניין מגורים%' OR legacy_type ILIKE '%בניית בניין מגורים%' THEN
      RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
    WHEN legacy_type ILIKE '%תמ"א%' OR legacy_type ILIKE '%התחדשות עירונית%' THEN
      RETURN 'תמ"א 38 - פינוי ובינוי';
    WHEN legacy_type ILIKE '%ביוב%' OR legacy_type ILIKE '%ניקוז%' THEN
      RETURN 'רשתות ביוב וניקוז';
    WHEN legacy_type ILIKE '%מגורים%' THEN
      RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
    WHEN legacy_type ILIKE '%משרדים%' OR legacy_type ILIKE '%משרד%' THEN
      RETURN 'בניין משרדים';
    WHEN legacy_type ILIKE '%תעשי%' THEN
      RETURN 'מבנה תעשייה';
    WHEN legacy_type ILIKE '%בריכ%' THEN
      RETURN 'מתקני ספורט ונופש';
    WHEN legacy_type ILIKE '%בית ספר%' OR legacy_type ILIKE '%חינוך%' THEN
      RETURN 'בית ספר';
    WHEN legacy_type ILIKE '%בית חולים%' OR legacy_type ILIKE '%רפוא%' THEN
      RETURN 'בית חולים';
    WHEN legacy_type ILIKE '%מלון%' THEN
      RETURN 'מלון';
    WHEN legacy_type ILIKE '%קניון%' OR legacy_type ILIKE '%מסחר%' THEN
      RETURN 'מרכז מסחרי / קניון';
    ELSE
      -- Default fallback for unrecognized types
      RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
  END CASE;
END;
$$;

-- Update existing projects to use normalized types
UPDATE public.projects 
SET type = public.normalize_project_type(type)
WHERE type IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(type);

-- Add check to ensure future project types are valid (optional)
-- This will be enforced at the application level for now
-- Add phase column to projects table for project status tracking
ALTER TABLE public.projects 
ADD COLUMN phase text DEFAULT 'תכנון ראשוני';

-- Add comment for clarity
COMMENT ON COLUMN public.projects.phase IS 'Project phase/status like תכנון ראשוני, תכנון מפורט, etc.';
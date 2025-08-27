
-- Add advisors budget and description to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS advisors_budget numeric NULL,
  ADD COLUMN IF NOT EXISTS description text NULL;

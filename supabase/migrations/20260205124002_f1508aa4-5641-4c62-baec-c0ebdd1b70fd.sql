-- Fix: Drop legacy unique index that blocks multi-service advisors
-- The previous migration dropped the constraint but this separate index 
-- still enforces UNIQUE (project_id, advisor_id), blocking approval of 
-- the same advisor for different service types
DROP INDEX IF EXISTS public.idx_project_advisors_project_advisor;
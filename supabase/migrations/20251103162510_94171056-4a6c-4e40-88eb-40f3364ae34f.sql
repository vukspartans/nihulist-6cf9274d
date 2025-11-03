-- Fix infinite recursion by converting helper functions from SQL to PL/pgSQL
-- This ensures they don't trigger RLS policies when querying tables

-- First, drop the policies that depend on the functions
DROP POLICY IF EXISTS advisors_view_invited_projects ON public.projects;
DROP POLICY IF EXISTS "Users can view RFPs for their projects" ON public.rfps;

-- Drop and recreate is_advisor_invited_to_project with PL/pgSQL
DROP FUNCTION IF EXISTS public.is_advisor_invited_to_project(uuid, uuid);
CREATE OR REPLACE FUNCTION public.is_advisor_invited_to_project(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- PL/pgSQL with SECURITY DEFINER bypasses RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.rfps r
    JOIN public.rfp_invites ri ON ri.rfp_id = r.id
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE r.project_id = _project_id
      AND a.user_id = _user_id
  );
END;
$$;

-- Drop and recreate is_project_owned_by_user with PL/pgSQL
DROP FUNCTION IF EXISTS public.is_project_owned_by_user(uuid, uuid);
CREATE OR REPLACE FUNCTION public.is_project_owned_by_user(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- PL/pgSQL with SECURITY DEFINER bypasses RLS
  RETURN EXISTS (
    SELECT 1 
    FROM public.projects p
    WHERE p.id = _project_id
      AND p.owner_id = _user_id
  );
END;
$$;

-- Now recreate the policies using the new functions
CREATE POLICY advisors_view_invited_projects
ON public.projects
FOR SELECT
USING (public.is_advisor_invited_to_project(projects.id, auth.uid()));

CREATE POLICY "Users can view RFPs for their projects"
ON public.rfps
FOR SELECT
USING (public.is_project_owned_by_user(rfps.project_id, auth.uid()));
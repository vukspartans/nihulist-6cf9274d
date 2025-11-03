-- Create helper function to check if advisor is invited to a project
-- This breaks the circular RLS dependency between projects and rfps
CREATE OR REPLACE FUNCTION public.is_advisor_invited_to_project(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rfps r
    JOIN public.rfp_invites ri ON ri.rfp_id = r.id
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE r.project_id = _project_id
      AND a.user_id = _user_id
  );
$$;

-- Create helper function to check if user owns a project
-- This breaks the circular RLS dependency between rfps and projects
CREATE OR REPLACE FUNCTION public.is_project_owned_by_user(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND p.owner_id = _user_id
  );
$$;

-- Replace the circular policy on projects with function-based policy
DROP POLICY IF EXISTS advisors_view_invited_projects ON public.projects;
CREATE POLICY advisors_view_invited_projects
ON public.projects
FOR SELECT
USING (public.is_advisor_invited_to_project(projects.id, auth.uid()));

-- Replace the circular policy on rfps with function-based policy
DROP POLICY IF EXISTS "Users can view RFPs for their projects" ON public.rfps;
CREATE POLICY "Users can view RFPs for their projects"
ON public.rfps
FOR SELECT
USING (public.is_project_owned_by_user(rfps.project_id, auth.uid()));
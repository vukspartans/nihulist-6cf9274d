-- Drop the old function-based policies that may be causing issues
DROP POLICY IF EXISTS "advisors_view_invited_rfps" ON public.rfps;
DROP POLICY IF EXISTS "advisors_view_invited_projects" ON public.projects;

-- Add a direct policy for advisors to view RFPs using subquery instead of security definer function
CREATE POLICY "advisors_can_view_their_invited_rfps_direct"
ON public.rfps
AS RESTRICTIVE
FOR SELECT
USING (
  id IN (
    SELECT ri.rfp_id 
    FROM public.rfp_invites ri
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
  )
);

-- Add similar policy for projects table to ensure advisors can view project details
CREATE POLICY "advisors_view_invited_projects_direct" 
ON public.projects
AS RESTRICTIVE
FOR SELECT
USING (
  id IN (
    SELECT r.project_id
    FROM public.rfps r
    JOIN public.rfp_invites ri ON ri.rfp_id = r.id
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
  )
);
-- Drop the existing RESTRICTIVE policy that's blocking entrepreneurs
DROP POLICY IF EXISTS "advisors_view_invited_projects_direct" ON public.projects;

-- Recreate as PERMISSIVE policy so it doesn't conflict with entrepreneur access
CREATE POLICY "advisors_view_invited_projects_direct"
ON public.projects 
FOR SELECT
USING (
  -- Allow advisors to view projects they're invited to via RFPs
  id IN (
    SELECT r.project_id
    FROM public.rfps r
    JOIN public.rfp_invites ri ON ri.rfp_id = r.id
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
  )
);
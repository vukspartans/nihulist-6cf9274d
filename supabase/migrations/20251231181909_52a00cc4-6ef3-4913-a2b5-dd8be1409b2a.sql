-- Step A: Create helper function for ownership of an RFP
CREATE OR REPLACE FUNCTION public.is_rfp_sent_by_user(_rfp_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfps
    WHERE id = _rfp_id AND sent_by = _user_id
  )
$$;

-- Step B: Fix rfps advisor SELECT policy (remove direct reference to rfp_invites)
DROP POLICY IF EXISTS "advisors_can_view_their_invited_rfps_direct" ON public.rfps;

CREATE POLICY "advisors_can_view_their_invited_rfps_direct"
ON public.rfps
FOR SELECT
TO authenticated
USING (public.is_user_invited_to_rfp(id, auth.uid()));

-- Step C: Fix projects advisor SELECT policy (remove direct reference to rfp_invites)
DROP POLICY IF EXISTS "advisors_view_invited_projects_direct" ON public.projects;

CREATE POLICY "advisors_view_invited_projects_direct"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_advisor_invited_to_project(id, auth.uid()));

-- Step D: Fix rfp_invites entrepreneur ALL policy
DROP POLICY IF EXISTS "Entrepreneurs can manage draft invites" ON public.rfp_invites;

CREATE POLICY "Entrepreneurs can manage invites"
ON public.rfp_invites
FOR ALL
TO authenticated
USING (public.is_rfp_sent_by_user(rfp_id, auth.uid()))
WITH CHECK (public.is_rfp_sent_by_user(rfp_id, auth.uid()));
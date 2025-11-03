-- Comprehensive RLS fix: Eliminate all cross-table recursion risks
-- Creates helper functions and rewires all policies to use them

-- ============================================================
-- PART 1: Create new helper functions (SECURITY DEFINER PL/pgSQL)
-- ============================================================

-- Helper: Check if a user is invited to an RFP
CREATE OR REPLACE FUNCTION public.is_user_invited_to_rfp(_rfp_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.rfp_invites ri
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE ri.rfp_id = _rfp_id
      AND a.user_id = _user_id
  );
END;
$$;

-- Helper: Check if an invite is visible to an advisor
CREATE OR REPLACE FUNCTION public.is_invite_visible_to_advisor(_invite_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.rfp_invites ri
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE ri.id = _invite_id
      AND a.user_id = _user_id
  );
END;
$$;

-- Helper: Check if an invite is visible to an entrepreneur
CREATE OR REPLACE FUNCTION public.is_invite_visible_to_entrepreneur(_invite_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.rfp_invites ri
    JOIN public.rfps r ON r.id = ri.rfp_id
    JOIN public.projects p ON p.id = r.project_id
    WHERE ri.id = _invite_id
      AND p.owner_id = _user_id
  );
END;
$$;

-- ============================================================
-- PART 2: Rewire RLS policies on rfps
-- ============================================================

DROP POLICY IF EXISTS advisors_view_invited_rfps ON public.rfps;
CREATE POLICY advisors_view_invited_rfps
ON public.rfps
FOR SELECT
USING (public.is_user_invited_to_rfp(rfps.id, auth.uid()));

-- ============================================================
-- PART 3: Rewire RLS policies on rfp_invites
-- ============================================================

DROP POLICY IF EXISTS "Advisors can view their RFP invites" ON public.rfp_invites;
DROP POLICY IF EXISTS "Entrepreneurs can view RFP invites for their projects" ON public.rfp_invites;
DROP POLICY IF EXISTS "Users can view RFP invites for their projects" ON public.rfp_invites;

CREATE POLICY "Users can view relevant invites"
ON public.rfp_invites
FOR SELECT
USING (
  public.is_invite_visible_to_advisor(rfp_invites.id, auth.uid())
  OR
  public.is_invite_visible_to_entrepreneur(rfp_invites.id, auth.uid())
);

DROP POLICY IF EXISTS "Advisors can update their invite status" ON public.rfp_invites;
CREATE POLICY "Advisors can update their invite status"
ON public.rfp_invites
FOR UPDATE
USING (public.is_invite_visible_to_advisor(rfp_invites.id, auth.uid()))
WITH CHECK (public.is_invite_visible_to_advisor(rfp_invites.id, auth.uid()));

DROP POLICY IF EXISTS "Advisors can mark RFP in progress" ON public.rfp_invites;
CREATE POLICY "Advisors can mark RFP in progress"
ON public.rfp_invites
FOR UPDATE
USING (
  public.is_invite_visible_to_advisor(rfp_invites.id, auth.uid()) 
  AND status IN ('sent'::rfp_invite_status, 'opened'::rfp_invite_status)
)
WITH CHECK (
  public.is_invite_visible_to_advisor(rfp_invites.id, auth.uid()) 
  AND status = 'in_progress'::rfp_invite_status
);

-- ============================================================
-- PART 4: Rewire RLS policies on project_files
-- ============================================================

DROP POLICY IF EXISTS "Users can view files of their projects" ON public.project_files;
CREATE POLICY "Users can view files of their projects"
ON public.project_files
FOR SELECT
USING (public.is_project_owned_by_user(project_files.project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create files for their projects" ON public.project_files;
CREATE POLICY "Users can create files for their projects"
ON public.project_files
FOR INSERT
WITH CHECK (public.is_project_owned_by_user(project_files.project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update files of their projects" ON public.project_files;
CREATE POLICY "Users can update files of their projects"
ON public.project_files
FOR UPDATE
USING (public.is_project_owned_by_user(project_files.project_id, auth.uid()))
WITH CHECK (public.is_project_owned_by_user(project_files.project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete files of their projects" ON public.project_files;
CREATE POLICY "Users can delete files of their projects"
ON public.project_files
FOR DELETE
USING (public.is_project_owned_by_user(project_files.project_id, auth.uid()));

-- ============================================================
-- PART 5: Rewire RLS policies on proposals
-- ============================================================

DROP POLICY IF EXISTS "Users can view proposals for their projects" ON public.proposals;
CREATE POLICY "Users can view proposals for their projects"
ON public.proposals
FOR SELECT
USING (public.is_project_owned_by_user(proposals.project_id, auth.uid()));

DROP POLICY IF EXISTS "Entrepreneurs can update proposal status only" ON public.proposals;
CREATE POLICY "Entrepreneurs can update proposal status only"
ON public.proposals
FOR UPDATE
USING (public.is_project_owned_by_user(proposals.project_id, auth.uid()))
WITH CHECK (public.is_project_owned_by_user(proposals.project_id, auth.uid()));

-- ============================================================
-- PART 6: Rewire RLS policies on activity_log
-- ============================================================

DROP POLICY IF EXISTS "Users can view activity for their projects" ON public.activity_log;
CREATE POLICY "Users can view activity for their projects"
ON public.activity_log
FOR SELECT
USING (
  activity_log.project_id IS NULL
  OR public.is_project_owned_by_user(activity_log.project_id, auth.uid())
);

-- ============================================================
-- PART 7: Rewire RLS policies on recommendations
-- ============================================================

DROP POLICY IF EXISTS "Users can view recommendations for their projects" ON public.recommendations;
CREATE POLICY "Users can view recommendations for their projects"
ON public.recommendations
FOR SELECT
USING (public.is_project_owned_by_user(recommendations.project_id, auth.uid()));

-- ============================================================
-- PART 8: Rewire RLS policies on project_advisors
-- ============================================================

DROP POLICY IF EXISTS "Entrepreneurs can view their project advisors" ON public.project_advisors;
CREATE POLICY "Entrepreneurs can view their project advisors"
ON public.project_advisors
FOR SELECT
USING (public.is_project_owned_by_user(project_advisors.project_id, auth.uid()));

DROP POLICY IF EXISTS "Entrepreneurs can update their project advisors" ON public.project_advisors;
CREATE POLICY "Entrepreneurs can update their project advisors"
ON public.project_advisors
FOR UPDATE
USING (public.is_project_owned_by_user(project_advisors.project_id, auth.uid()));

DROP POLICY IF EXISTS "Entrepreneurs can add advisors to their projects" ON public.project_advisors;
CREATE POLICY "Entrepreneurs can add advisors to their projects"
ON public.project_advisors
FOR INSERT
WITH CHECK (public.is_project_owned_by_user(project_advisors.project_id, auth.uid()));
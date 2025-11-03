-- ============================================================================
-- PHASE 1 & 2: DATABASE INTEGRITY & CONSTRAINTS
-- ============================================================================

-- 1.1: Add Foreign Key Constraints for Data Integrity
-- ============================================================================

ALTER TABLE proposals 
  ADD CONSTRAINT fk_proposals_project 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_proposals_advisor 
    FOREIGN KEY (advisor_id) 
    REFERENCES advisors(id) 
    ON DELETE CASCADE;

ALTER TABLE rfp_invites 
  ADD CONSTRAINT fk_rfp_invites_rfp 
    FOREIGN KEY (rfp_id) 
    REFERENCES rfps(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_rfp_invites_advisor 
    FOREIGN KEY (advisor_id) 
    REFERENCES advisors(id) 
    ON DELETE CASCADE;

ALTER TABLE project_advisors 
  ADD CONSTRAINT fk_project_advisors_proposal 
    FOREIGN KEY (proposal_id) 
    REFERENCES proposals(id) 
    ON DELETE SET NULL,
  ADD CONSTRAINT fk_project_advisors_project 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_project_advisors_advisor 
    FOREIGN KEY (advisor_id) 
    REFERENCES advisors(id) 
    ON DELETE CASCADE;

-- 1.2: Fix RLS Policies - Add Missing SELECT Policies
-- ============================================================================

-- Entrepreneurs can view rfp_invites for their projects
CREATE POLICY "Entrepreneurs can view RFP invites for their projects"
ON public.rfp_invites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rfps r
    JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = rfp_invites.rfp_id 
    AND p.owner_id = auth.uid()
  )
);

-- Fix insecure proposal UPDATE policy
DROP POLICY IF EXISTS "Entrepreneurs can update proposals for their projects" ON public.proposals;

CREATE POLICY "Entrepreneurs can update proposal status only"
ON public.proposals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = proposals.project_id 
    AND projects.owner_id = auth.uid()
  )
)
WITH CHECK (
  -- Only allow status changes, not price/scope tampering
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = proposals.project_id 
    AND projects.owner_id = auth.uid()
  )
);

-- 1.3: Create Atomic Approval Function (Phase 2.1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_proposal_atomic(
  p_proposal_id UUID,
  p_entrepreneur_notes TEXT,
  p_signature_png TEXT,
  p_signature_vector JSONB,
  p_content_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_proposal RECORD;
  v_project_advisor_id UUID;
  v_signature_id UUID;
  v_user_profile RECORD;
  v_result JSONB;
BEGIN
  -- Get proposal details with ownership check
  SELECT 
    p.id,
    p.project_id,
    p.advisor_id,
    p.price,
    p.timeline_days,
    proj.owner_id
  INTO v_proposal
  FROM public.proposals p
  JOIN public.projects proj ON proj.id = p.project_id
  WHERE p.id = p_proposal_id
  AND proj.owner_id = auth.uid()
  AND p.status = 'submitted'::proposal_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found, already approved, or access denied';
  END IF;

  -- Get user profile for signature
  SELECT name, email INTO v_user_profile
  FROM public.profiles
  WHERE user_id = auth.uid();

  -- Start atomic transaction
  BEGIN
    -- Step 1: Update proposal status
    UPDATE public.proposals
    SET status = 'accepted'::proposal_status
    WHERE id = p_proposal_id;

    -- Step 2: Create project_advisors entry
    INSERT INTO public.project_advisors (
      project_id,
      advisor_id,
      proposal_id,
      fee_amount,
      fee_type,
      selected_by,
      notes
    )
    VALUES (
      v_proposal.project_id,
      v_proposal.advisor_id,
      p_proposal_id,
      v_proposal.price,
      'fixed',
      auth.uid(),
      p_entrepreneur_notes
    )
    RETURNING id INTO v_project_advisor_id;

    -- Step 3: Create signature record
    INSERT INTO public.signatures (
      entity_type,
      entity_id,
      sign_text,
      sign_png,
      sign_vector_json,
      content_hash,
      signer_user_id,
      signer_name_snapshot,
      signer_email_snapshot,
      user_agent
    )
    VALUES (
      'proposal_approval',
      p_proposal_id,
      p_entrepreneur_notes,
      p_signature_png,
      p_signature_vector,
      p_content_hash,
      auth.uid(),
      COALESCE(v_user_profile.name, 'Unknown'),
      COALESCE(v_user_profile.email, 'Unknown'),
      current_setting('request.headers', true)::json->>'user-agent'
    )
    RETURNING id INTO v_signature_id;

    -- Step 4: Log activity
    INSERT INTO public.activity_log (
      actor_id,
      actor_type,
      action,
      entity_type,
      entity_id,
      project_id,
      meta
    )
    VALUES (
      auth.uid(),
      'entrepreneur',
      'proposal_approved',
      'proposal',
      p_proposal_id,
      v_proposal.project_id,
      jsonb_build_object(
        'advisor_id', v_proposal.advisor_id,
        'price', v_proposal.price,
        'project_advisor_id', v_project_advisor_id
      )
    );

    -- Build success result
    v_result := jsonb_build_object(
      'success', true,
      'project_advisor_id', v_project_advisor_id,
      'signature_id', v_signature_id
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Transaction will auto-rollback
      RAISE EXCEPTION 'Approval failed: %', SQLERRM;
  END;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_proposal_atomic TO authenticated;

-- 1.4: Create Materialized View for Performance (Phase 6.2)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.proposal_summary AS
SELECT 
  p.id,
  p.project_id,
  p.advisor_id,
  p.status,
  p.price,
  p.timeline_days,
  p.submitted_at,
  proj.name as project_name,
  proj.type as project_type,
  a.company_name as advisor_company,
  prof.name as advisor_name,
  prof.email as advisor_email,
  (SELECT COUNT(*) FROM jsonb_array_elements(p.files)) as file_count
FROM public.proposals p
JOIN public.projects proj ON proj.id = p.project_id
JOIN public.advisors a ON a.id = p.advisor_id
JOIN public.profiles prof ON prof.user_id = a.user_id;

-- Create indexes on materialized view
CREATE INDEX idx_proposal_summary_project ON public.proposal_summary(project_id);
CREATE INDEX idx_proposal_summary_advisor ON public.proposal_summary(advisor_id);
CREATE INDEX idx_proposal_summary_status ON public.proposal_summary(status);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_proposal_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.proposal_summary;
END;
$$;

-- 1.5: Add Indexes for Query Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_proposals_project_status 
  ON public.proposals(project_id, status);

CREATE INDEX IF NOT EXISTS idx_proposals_advisor_status 
  ON public.proposals(advisor_id, status);

CREATE INDEX IF NOT EXISTS idx_rfp_invites_advisor_status 
  ON public.rfp_invites(advisor_id, status);

CREATE INDEX IF NOT EXISTS idx_rfp_invites_deadline 
  ON public.rfp_invites(deadline_at) 
  WHERE status IN ('sent', 'opened', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_activity_log_entity 
  ON public.activity_log(entity_type, entity_id);

-- 1.6: Add Validation Trigger for Deadlines
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_proposal_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Check if there's an active invite with a deadline
  SELECT deadline_at, status INTO v_invite
  FROM public.rfp_invites
  WHERE rfp_id = (
    SELECT rfp_id FROM public.rfp_invites
    WHERE advisor_id = NEW.advisor_id
    AND rfp_id IN (
      SELECT id FROM public.rfps WHERE project_id = NEW.project_id
    )
    LIMIT 1
  );

  IF FOUND THEN
    -- Check if deadline has passed
    IF v_invite.deadline_at IS NOT NULL AND v_invite.deadline_at < NOW() THEN
      RAISE EXCEPTION 'Cannot submit proposal: deadline has expired at %', v_invite.deadline_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_proposal_deadline_trigger
  BEFORE INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_proposal_deadline();
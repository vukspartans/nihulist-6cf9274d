-- Migration: Support multiple service types per advisor per project
-- This allows the same advisor to provide different services (e.g., plumbing AND waste) on the same project

-- 1. Add advisor_type column to project_advisors
ALTER TABLE public.project_advisors 
ADD COLUMN IF NOT EXISTS advisor_type TEXT;

-- 2. Backfill existing records from rfp_invites via proposals
UPDATE public.project_advisors pa
SET advisor_type = ri.advisor_type
FROM public.proposals p
JOIN public.rfp_invites ri ON ri.id = p.rfp_invite_id
WHERE pa.proposal_id = p.id
  AND pa.advisor_type IS NULL;

-- 3. Drop old constraint that only used (project_id, advisor_id)
ALTER TABLE public.project_advisors 
DROP CONSTRAINT IF EXISTS project_advisors_project_id_advisor_id_key;

-- 4. Add new constraint that includes advisor_type
ALTER TABLE public.project_advisors 
ADD CONSTRAINT project_advisors_project_advisor_type_unique 
UNIQUE (project_id, advisor_id, advisor_type);

-- 5. Update approve_proposal_atomic function to include advisor_type
CREATE OR REPLACE FUNCTION public.approve_proposal_atomic(
  p_proposal_id uuid,
  p_entrepreneur_notes text,
  p_signature_png text,
  p_signature_vector jsonb,
  p_content_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal RECORD;
  v_project_advisor_id UUID;
  v_signature_id UUID;
  v_user_profile RECORD;
  v_result JSONB;
BEGIN
  -- Get proposal details with ownership check
  -- Include advisor_type from rfp_invite for multi-service support
  SELECT 
    p.id,
    p.project_id,
    p.advisor_id,
    p.price,
    p.timeline_days,
    proj.owner_id,
    ri.advisor_type
  INTO v_proposal
  FROM public.proposals p
  JOIN public.projects proj ON proj.id = p.project_id
  LEFT JOIN public.rfp_invites ri ON ri.id = p.rfp_invite_id
  WHERE p.id = p_proposal_id
  AND proj.owner_id = auth.uid()
  AND p.status IN ('submitted'::proposal_status, 'resubmitted'::proposal_status);

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
    SET status = 'accepted'::proposal_status,
        has_active_negotiation = false
    WHERE id = p_proposal_id;

    -- Step 2: Create or update project_advisors entry (UPSERT with advisor_type)
    INSERT INTO public.project_advisors (
      project_id,
      advisor_id,
      advisor_type,
      proposal_id,
      fee_amount,
      fee_type,
      selected_by,
      notes
    )
    VALUES (
      v_proposal.project_id,
      v_proposal.advisor_id,
      v_proposal.advisor_type,
      p_proposal_id,
      v_proposal.price,
      'fixed',
      auth.uid(),
      p_entrepreneur_notes
    )
    ON CONFLICT (project_id, advisor_id, advisor_type) 
    DO UPDATE SET
      proposal_id = EXCLUDED.proposal_id,
      fee_amount = EXCLUDED.fee_amount,
      notes = EXCLUDED.notes,
      updated_at = now()
    RETURNING id INTO v_project_advisor_id;

    -- Step 3: Update rfp_invites status to 'submitted' for data consistency
    UPDATE public.rfp_invites
    SET status = 'submitted'::rfp_invite_status
    WHERE advisor_id = v_proposal.advisor_id
      AND rfp_id IN (
        SELECT id FROM public.rfps WHERE project_id = v_proposal.project_id
      )
      AND status NOT IN ('declined'::rfp_invite_status, 'expired'::rfp_invite_status);

    -- Step 4: Close any active negotiation sessions
    UPDATE public.negotiation_sessions
    SET status = 'resolved',
        resolved_at = now(),
        updated_at = now()
    WHERE proposal_id = p_proposal_id
      AND status IN ('open', 'awaiting_response', 'responded');

    -- Step 5: Create signature record
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
      COALESCE(p_entrepreneur_notes, ''),
      p_signature_png,
      COALESCE(p_signature_vector, '{}'::JSONB),
      COALESCE(p_content_hash, ''),
      auth.uid(),
      COALESCE(v_user_profile.name, 'Unknown'),
      COALESCE(v_user_profile.email, 'Unknown'),
      current_setting('request.headers', true)::json->>'user-agent'
    )
    RETURNING id INTO v_signature_id;

    -- Step 6: Log activity
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
        'advisor_type', v_proposal.advisor_type,
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
$function$;
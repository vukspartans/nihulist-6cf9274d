-- Phase 4: Update approve_proposal_atomic to mark rfp_invite as accepted
-- This ensures data consistency when a proposal is approved

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

    -- Step 3: Update rfp_invites status to 'accepted' for data consistency
    UPDATE public.rfp_invites
    SET status = 'submitted'::rfp_invite_status
    WHERE advisor_id = v_proposal.advisor_id
      AND rfp_id IN (
        SELECT id FROM public.rfps WHERE project_id = v_proposal.project_id
      )
      AND status NOT IN ('declined'::rfp_invite_status, 'expired'::rfp_invite_status);

    -- Step 4: Create signature record
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

    -- Step 5: Log activity
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
$function$;
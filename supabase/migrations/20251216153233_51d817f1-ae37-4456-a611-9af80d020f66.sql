-- =====================================================
-- NEGOTIATION MODULE SCHEMA TIGHTENING (FIXED)
-- =====================================================

-- 1. Add negotiated_version_id to negotiation_sessions
ALTER TABLE public.negotiation_sessions 
ADD COLUMN IF NOT EXISTS negotiated_version_id UUID REFERENCES public.proposal_versions(id);

-- 2. Add proposal_version_id to proposal_line_items for version-scoping
ALTER TABLE public.proposal_line_items 
ADD COLUMN IF NOT EXISTS proposal_version_id UUID REFERENCES public.proposal_versions(id);

-- 3. Create unique constraint: one active session per version
DROP INDEX IF EXISTS idx_unique_active_negotiation_per_version;
CREATE UNIQUE INDEX idx_unique_active_negotiation_per_version 
ON public.negotiation_sessions(negotiated_version_id) 
WHERE status IN ('open', 'awaiting_response');

-- 4. Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposal_line_items_version_id 
ON public.proposal_line_items(proposal_version_id);

CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_proposal_id 
ON public.negotiation_sessions(proposal_id);

CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_status 
ON public.negotiation_sessions(status);

-- 5. Database function: Submit negotiation response (create new version)
CREATE OR REPLACE FUNCTION public.submit_negotiation_response(
  p_session_id UUID,
  p_updated_line_items JSONB,
  p_consultant_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_session RECORD;
  v_proposal RECORD;
  v_prev_version RECORD;
  v_new_version_id UUID;
  v_new_version_number INTEGER;
  v_new_total NUMERIC := 0;
  v_item JSONB;
  v_prev_line_item RECORD;
BEGIN
  -- 1. Get session and validate consultant owns it
  SELECT ns.*, a.user_id as advisor_user_id
  INTO v_session
  FROM public.negotiation_sessions ns
  JOIN public.advisors a ON a.id = ns.consultant_advisor_id
  WHERE ns.id = p_session_id
    AND ns.status = 'awaiting_response';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not awaiting response';
  END IF;
  
  IF v_session.advisor_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to respond to this negotiation';
  END IF;
  
  -- 2. Get proposal and previous version
  SELECT * INTO v_proposal FROM public.proposals WHERE id = v_session.proposal_id;
  SELECT * INTO v_prev_version FROM public.proposal_versions 
  WHERE id = v_session.negotiated_version_id;
  
  v_new_version_number := COALESCE(v_proposal.current_version, 1) + 1;
  
  -- 3. Calculate new total from updated line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
  LOOP
    v_new_total := v_new_total + COALESCE((v_item->>'consultant_response_price')::NUMERIC, 0);
  END LOOP;
  
  -- 4. Create new proposal_versions record
  INSERT INTO public.proposal_versions (
    proposal_id,
    version_number,
    price,
    timeline_days,
    scope_text,
    terms,
    conditions_json,
    created_by,
    change_reason
  ) VALUES (
    v_session.proposal_id,
    v_new_version_number,
    v_new_total,
    v_prev_version.timeline_days,
    v_prev_version.scope_text,
    v_prev_version.terms,
    v_prev_version.conditions_json,
    v_session.consultant_advisor_id,
    'תגובה למשא ומתן'
  )
  RETURNING id INTO v_new_version_id;
  
  -- 5. Create version-scoped line items with updated prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
  LOOP
    SELECT * INTO v_prev_line_item 
    FROM public.proposal_line_items 
    WHERE id = (v_item->>'line_item_id')::UUID;
    
    IF FOUND THEN
      INSERT INTO public.proposal_line_items (
        proposal_id,
        proposal_version_id,
        version_number,
        name,
        description,
        category,
        quantity,
        unit_price,
        total,
        is_optional,
        display_order
      ) VALUES (
        v_session.proposal_id,
        v_new_version_id,
        v_new_version_number,
        v_prev_line_item.name,
        v_prev_line_item.description,
        v_prev_line_item.category,
        v_prev_line_item.quantity,
        (v_item->>'consultant_response_price')::NUMERIC / GREATEST(v_prev_line_item.quantity, 1),
        (v_item->>'consultant_response_price')::NUMERIC,
        v_prev_line_item.is_optional,
        v_prev_line_item.display_order
      );
      
      UPDATE public.line_item_negotiations
      SET consultant_response_price = (v_item->>'consultant_response_price')::NUMERIC,
          consultant_note = v_item->>'consultant_note',
          updated_at = now()
      WHERE session_id = p_session_id
        AND line_item_id = (v_item->>'line_item_id')::UUID;
    END IF;
  END LOOP;
  
  -- 6. Update proposal status and current_version
  UPDATE public.proposals
  SET status = 'resubmitted',
      current_version = v_new_version_number,
      price = v_new_total,
      has_active_negotiation = false
  WHERE id = v_session.proposal_id;
  
  -- 7. Update negotiation_sessions status
  UPDATE public.negotiation_sessions
  SET status = 'responded',
      responded_at = now(),
      consultant_response_message = p_consultant_message,
      updated_at = now()
  WHERE id = p_session_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_version_id', v_new_version_id,
    'new_version_number', v_new_version_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 6. Database function: Approve proposal with negotiation cleanup
CREATE OR REPLACE FUNCTION public.approve_proposal_with_negotiation_cleanup(
  p_proposal_id UUID,
  p_entrepreneur_notes TEXT DEFAULT NULL,
  p_signature_png TEXT DEFAULT NULL,
  p_signature_vector JSONB DEFAULT NULL,
  p_content_hash TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_proposal RECORD;
  v_project_advisor_id UUID;
  v_signature_id UUID;
  v_user_profile RECORD;
BEGIN
  SELECT p.*, proj.owner_id
  INTO v_proposal
  FROM public.proposals p
  JOIN public.projects proj ON proj.id = p.project_id
  WHERE p.id = p_proposal_id
    AND proj.owner_id = auth.uid()
    AND p.status IN ('submitted', 'resubmitted');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found, already processed, or access denied';
  END IF;
  
  SELECT name, email INTO v_user_profile
  FROM public.profiles WHERE user_id = auth.uid();
  
  UPDATE public.proposals
  SET status = 'accepted', has_active_negotiation = false
  WHERE id = p_proposal_id;
  
  UPDATE public.negotiation_sessions
  SET status = 'resolved', resolved_at = now(), updated_at = now()
  WHERE proposal_id = p_proposal_id
    AND status IN ('open', 'awaiting_response', 'responded');
  
  INSERT INTO public.project_advisors (
    project_id, advisor_id, proposal_id, fee_amount, fee_type, selected_by, notes
  ) VALUES (
    v_proposal.project_id, v_proposal.advisor_id, p_proposal_id,
    v_proposal.price, 'fixed', auth.uid(), p_entrepreneur_notes
  ) RETURNING id INTO v_project_advisor_id;
  
  IF p_signature_png IS NOT NULL THEN
    INSERT INTO public.signatures (
      entity_type, entity_id, sign_text, sign_png, sign_vector_json, content_hash,
      signer_user_id, signer_name_snapshot, signer_email_snapshot, user_agent
    ) VALUES (
      'proposal_approval', p_proposal_id, COALESCE(p_entrepreneur_notes, ''),
      p_signature_png, COALESCE(p_signature_vector, '{}'::JSONB),
      COALESCE(p_content_hash, ''), auth.uid(),
      COALESCE(v_user_profile.name, 'Unknown'),
      COALESCE(v_user_profile.email, 'Unknown'),
      current_setting('request.headers', true)::json->>'user-agent'
    ) RETURNING id INTO v_signature_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'project_advisor_id', v_project_advisor_id,
    'signature_id', v_signature_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 7. Database function: Reject proposal with negotiation cleanup
CREATE OR REPLACE FUNCTION public.reject_proposal_with_cleanup(
  p_proposal_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_proposal RECORD;
BEGIN
  SELECT p.*, proj.owner_id
  INTO v_proposal
  FROM public.proposals p
  JOIN public.projects proj ON proj.id = p.project_id
  WHERE p.id = p_proposal_id
    AND proj.owner_id = auth.uid()
    AND p.status NOT IN ('accepted', 'rejected', 'withdrawn');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found, already processed, or access denied';
  END IF;
  
  UPDATE public.proposals
  SET status = 'rejected', has_active_negotiation = false
  WHERE id = p_proposal_id;
  
  UPDATE public.negotiation_sessions
  SET status = 'cancelled', resolved_at = now(), updated_at = now()
  WHERE proposal_id = p_proposal_id
    AND status IN ('open', 'awaiting_response', 'responded');
  
  RETURN jsonb_build_object('success', true, 'proposal_id', p_proposal_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 8. RLS Policies 
ALTER TABLE public.negotiation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_item_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_line_items ENABLE ROW LEVEL SECURITY;
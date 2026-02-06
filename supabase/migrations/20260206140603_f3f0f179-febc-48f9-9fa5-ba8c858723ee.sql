-- Fix: Correct the status check in submit_negotiation_response
-- The function was checking for 'pending' which is not a valid negotiation_status enum value
-- Valid values are: open, awaiting_response, responded, resolved, cancelled
-- The correct status to check is 'awaiting_response'

CREATE OR REPLACE FUNCTION public.submit_negotiation_response(
  p_session_id uuid,
  p_consultant_message text DEFAULT NULL,
  p_updated_line_items jsonb DEFAULT NULL,
  p_milestone_adjustments jsonb DEFAULT NULL,
  p_files jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session negotiation_sessions%ROWTYPE;
  v_proposal proposals%ROWTYPE;
  v_new_version_id uuid;
  v_new_version_number integer;
  v_item jsonb;
  v_new_price numeric;
  v_line_items jsonb;
  v_updated_fee_items jsonb;
BEGIN
  -- Get session with lock
  SELECT * INTO v_session
  FROM negotiation_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negotiation session not found';
  END IF;

  -- FIX: Check for 'awaiting_response' instead of 'pending'
  IF v_session.status != 'awaiting_response' THEN
    RAISE EXCEPTION 'Session is not awaiting response';
  END IF;

  -- Get proposal
  SELECT * INTO v_proposal
  FROM proposals
  WHERE id = v_session.proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  -- Calculate new version number
  v_new_version_number := COALESCE(v_proposal.current_version, 1) + 1;
  v_new_version_id := gen_random_uuid();

  -- Get current line items from proposal
  v_line_items := COALESCE(v_proposal.fee_line_items, '[]'::jsonb);

  -- Apply price updates to fee_line_items if provided
  IF p_updated_line_items IS NOT NULL AND jsonb_array_length(p_updated_line_items) > 0 THEN
    v_updated_fee_items := '[]'::jsonb;
    
    -- Iterate through existing line items and update prices
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_line_items)
    LOOP
      -- Look for matching update
      SELECT (update_item->>'consultant_response_price')::numeric INTO v_new_price
      FROM jsonb_array_elements(p_updated_line_items) AS update_item
      WHERE update_item->>'line_item_id' = v_item->>'item_id'
         OR update_item->>'line_item_id' = (v_item->>'item_number')::text;
      
      IF v_new_price IS NOT NULL THEN
        -- Update the unit_price and recalculate total
        v_item := jsonb_set(v_item, '{unit_price}', to_jsonb(v_new_price));
        v_item := jsonb_set(v_item, '{total}', to_jsonb(v_new_price * COALESCE((v_item->>'quantity')::numeric, 1)));
      END IF;
      
      v_updated_fee_items := v_updated_fee_items || jsonb_build_array(v_item);
    END LOOP;
    
    v_line_items := v_updated_fee_items;
  END IF;

  -- Calculate new total from line items
  SELECT COALESCE(SUM((item->>'total')::numeric), v_proposal.price)
  INTO v_new_price
  FROM jsonb_array_elements(v_line_items) AS item;

  -- Create new proposal version
  INSERT INTO proposal_versions (
    id,
    proposal_id,
    version_number,
    price,
    timeline_days,
    scope_text,
    terms,
    conditions_json,
    fee_line_items,
    milestone_adjustments,
    change_reason,
    created_by
  )
  VALUES (
    v_new_version_id,
    v_proposal.id,
    v_new_version_number,
    v_new_price,
    v_proposal.timeline_days,
    v_proposal.scope_text,
    v_proposal.terms,
    v_proposal.conditions_json,
    v_line_items,
    COALESCE(p_milestone_adjustments, v_proposal.milestone_adjustments),
    'Negotiation response',
    v_session.consultant_advisor_id
  );

  -- Update proposal with new version info
  UPDATE proposals
  SET 
    current_version = v_new_version_number,
    price = v_new_price,
    fee_line_items = v_line_items,
    milestone_adjustments = COALESCE(p_milestone_adjustments, proposals.milestone_adjustments),
    status = 'resubmitted'
  WHERE id = v_proposal.id;

  -- Update session
  UPDATE negotiation_sessions
  SET 
    status = 'responded',
    consultant_response_message = p_consultant_message,
    responded_at = NOW(),
    updated_at = NOW(),
    negotiated_version_id = v_new_version_id,
    files = CASE 
      WHEN p_files IS NOT NULL THEN 
        COALESCE(files, '{}'::jsonb) || jsonb_build_object('advisor_response_files', p_files)
      ELSE files
    END
  WHERE id = p_session_id;

  -- Update line item negotiations with consultant responses
  IF p_updated_line_items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
    LOOP
      UPDATE line_item_negotiations
      SET 
        consultant_response_price = (v_item->>'consultant_response_price')::numeric,
        consultant_note = v_item->>'consultant_note',
        updated_at = NOW()
      WHERE session_id = p_session_id
        AND line_item_id::text = v_item->>'line_item_id';
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'new_version_id', v_new_version_id,
    'new_version_number', v_new_version_number,
    'new_price', v_new_price
  );
END;
$$;
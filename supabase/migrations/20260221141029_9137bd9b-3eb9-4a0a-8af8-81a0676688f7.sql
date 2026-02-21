
-- Step 1: Fix the submit_negotiation_response function to reset seen_by_entrepreneur_at
CREATE OR REPLACE FUNCTION public.submit_negotiation_response(p_session_id uuid, p_consultant_message text DEFAULT NULL::text, p_updated_line_items jsonb DEFAULT NULL::jsonb, p_milestone_adjustments jsonb DEFAULT NULL::jsonb, p_files jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session negotiation_sessions%ROWTYPE;
  v_proposal proposals%ROWTYPE;
  v_advisor_user_id uuid;
  v_new_version_id uuid;
  v_new_version_number integer;
  v_item jsonb;
  v_new_price numeric;
  v_line_items jsonb;
  v_updated_fee_items jsonb;
BEGIN
  SELECT * INTO v_session
  FROM negotiation_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negotiation session not found';
  END IF;

  IF v_session.status != 'awaiting_response' THEN
    RAISE EXCEPTION 'Session is not awaiting response';
  END IF;

  SELECT * INTO v_proposal
  FROM proposals
  WHERE id = v_session.proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  SELECT user_id INTO v_advisor_user_id
  FROM advisors
  WHERE id = v_session.consultant_advisor_id;

  IF v_advisor_user_id IS NULL THEN
    RAISE EXCEPTION 'Advisor user_id not found for advisor %', v_session.consultant_advisor_id;
  END IF;

  v_new_version_number := COALESCE(v_proposal.current_version, 1) + 1;
  v_new_version_id := gen_random_uuid();

  v_line_items := COALESCE(v_proposal.fee_line_items, '[]'::jsonb);

  IF p_updated_line_items IS NOT NULL AND jsonb_array_length(p_updated_line_items) > 0 THEN
    v_updated_fee_items := '[]'::jsonb;
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_line_items)
    LOOP
      SELECT (update_item->>'consultant_response_price')::numeric INTO v_new_price
      FROM jsonb_array_elements(p_updated_line_items) AS update_item
      WHERE update_item->>'line_item_id' = v_item->>'item_id'
         OR update_item->>'line_item_id' = (v_item->>'item_number')::text;
      
      IF v_new_price IS NOT NULL THEN
        v_item := jsonb_set(v_item, '{unit_price}', to_jsonb(v_new_price));
        v_item := jsonb_set(v_item, '{total}', to_jsonb(v_new_price * COALESCE((v_item->>'quantity')::numeric, 1)));
      END IF;
      
      v_updated_fee_items := v_updated_fee_items || jsonb_build_array(v_item);
    END LOOP;
    
    v_line_items := v_updated_fee_items;
  END IF;

  SELECT COALESCE(SUM((item->>'total')::numeric), v_proposal.price)
  INTO v_new_price
  FROM jsonb_array_elements(v_line_items) AS item;

  INSERT INTO proposal_versions (
    id, proposal_id, version_number, price, timeline_days, scope_text, terms,
    conditions_json, fee_line_items, milestone_adjustments, change_reason, created_by
  )
  VALUES (
    v_new_version_id, v_proposal.id, v_new_version_number, v_new_price,
    v_proposal.timeline_days, v_proposal.scope_text, v_proposal.terms,
    v_proposal.conditions_json, v_line_items,
    COALESCE(p_milestone_adjustments, v_proposal.milestone_adjustments),
    'Negotiation response', v_advisor_user_id
  );

  -- Update proposal with new version info AND reset seen_by_entrepreneur_at
  UPDATE proposals
  SET 
    current_version = v_new_version_number,
    price = v_new_price,
    fee_line_items = v_line_items,
    milestone_adjustments = COALESCE(p_milestone_adjustments, proposals.milestone_adjustments),
    status = 'resubmitted',
    seen_by_entrepreneur_at = NULL  -- Reset so entrepreneur sees the counter-offer
  WHERE id = v_proposal.id;

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
$function$;

-- Step 2: Fix existing data - reset seen_by_entrepreneur_at for resubmitted proposals
UPDATE proposals 
SET seen_by_entrepreneur_at = NULL 
WHERE status = 'resubmitted' 
  AND seen_by_entrepreneur_at IS NOT NULL;

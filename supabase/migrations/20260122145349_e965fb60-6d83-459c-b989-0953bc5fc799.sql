-- Drop existing function and recreate with fee_line_items support
DROP FUNCTION IF EXISTS public.submit_negotiation_response(UUID, JSONB, TEXT);

CREATE FUNCTION public.submit_negotiation_response(
  p_session_id UUID,
  p_updated_line_items JSONB,
  p_consultant_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_proposal RECORD;
  v_prev_version RECORD;
  v_has_prev_version BOOLEAN := FALSE;
  v_new_version_id UUID;
  v_new_version_number INTEGER;
  v_new_total NUMERIC := 0;
  v_item JSONB;
  v_prev_line_item RECORD;
  v_updated_fee_line_items JSONB;
  v_original_fee_items JSONB;
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
  
  -- 2. Get proposal
  SELECT * INTO v_proposal FROM public.proposals WHERE id = v_session.proposal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;
  
  -- 3. Try to get previous version - use a flag to track if found
  IF v_session.negotiated_version_id IS NOT NULL THEN
    SELECT * INTO v_prev_version FROM public.proposal_versions 
    WHERE id = v_session.negotiated_version_id;
    
    IF FOUND THEN
      v_has_prev_version := TRUE;
    END IF;
  END IF;
  
  v_new_version_number := COALESCE(v_proposal.current_version, 1) + 1;
  
  -- 4. Get original fee_line_items from proposal (JSONB column)
  v_original_fee_items := COALESCE(v_proposal.fee_line_items, '[]'::jsonb);
  
  -- 5. Calculate new total and build updated fee_line_items
  IF jsonb_array_length(p_updated_line_items) > 0 THEN
    -- Build updated fee_line_items with new prices
    SELECT jsonb_agg(
      CASE 
        WHEN upd.line_item_id IS NOT NULL THEN
          jsonb_set(
            jsonb_set(
              item.val,
              '{unit_price}',
              to_jsonb(
                CASE 
                  WHEN (item.val->>'quantity')::numeric > 0 
                  THEN upd.response_price / (item.val->>'quantity')::numeric
                  ELSE upd.response_price
                END
              )
            ),
            '{total}',
            to_jsonb(upd.response_price)
          )
        ELSE item.val
      END
    )
    INTO v_updated_fee_line_items
    FROM jsonb_array_elements(v_original_fee_items) WITH ORDINALITY AS item(val, idx)
    LEFT JOIN (
      SELECT 
        elem->>'line_item_id' as line_item_id,
        (elem->>'consultant_response_price')::numeric as response_price
      FROM jsonb_array_elements(p_updated_line_items) elem
    ) upd ON 
      upd.line_item_id = COALESCE(item.val->>'item_id', item.val->>'id', (item.idx - 1)::text);
    
    -- Calculate new total from updated line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
    LOOP
      v_new_total := v_new_total + COALESCE((v_item->>'consultant_response_price')::NUMERIC, 0);
    END LOOP;
  ELSE
    -- No line items - use session target_total or fall back to proposal price
    v_new_total := COALESCE(v_session.target_total, v_proposal.price);
    v_updated_fee_line_items := v_original_fee_items;
  END IF;
  
  -- Ensure price is positive
  IF v_new_total <= 0 THEN
    v_new_total := v_proposal.price;
  END IF;
  
  -- 6. Create new proposal_versions record with line_items JSONB
  IF v_has_prev_version THEN
    INSERT INTO public.proposal_versions (
      proposal_id, version_number, price, timeline_days, scope_text,
      terms, conditions_json, line_items, created_by, change_reason
    ) VALUES (
      v_session.proposal_id, v_new_version_number, v_new_total,
      COALESCE(v_prev_version.timeline_days, v_proposal.timeline_days),
      COALESCE(v_prev_version.scope_text, v_proposal.scope_text),
      COALESCE(v_prev_version.terms, v_proposal.terms),
      COALESCE(v_prev_version.conditions_json, v_proposal.conditions_json),
      COALESCE(v_updated_fee_line_items, v_original_fee_items),
      v_session.advisor_user_id, 'תגובה למשא ומתן'
    ) RETURNING id INTO v_new_version_id;
  ELSE
    INSERT INTO public.proposal_versions (
      proposal_id, version_number, price, timeline_days, scope_text,
      terms, conditions_json, line_items, created_by, change_reason
    ) VALUES (
      v_session.proposal_id, v_new_version_number, v_new_total,
      v_proposal.timeline_days, v_proposal.scope_text,
      v_proposal.terms, v_proposal.conditions_json,
      COALESCE(v_updated_fee_line_items, v_original_fee_items),
      v_session.advisor_user_id, 'תגובה למשא ומתן'
    ) RETURNING id INTO v_new_version_id;
  END IF;
  
  -- 7. Also create version-scoped line items in proposal_line_items table (if they exist)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
  LOOP
    SELECT * INTO v_prev_line_item 
    FROM public.proposal_line_items 
    WHERE id = (v_item->>'line_item_id')::UUID;
    
    IF FOUND THEN
      INSERT INTO public.proposal_line_items (
        proposal_id, proposal_version_id, version_number, name, description,
        category, quantity, unit_price, total, is_optional, display_order
      ) VALUES (
        v_session.proposal_id, v_new_version_id, v_new_version_number,
        v_prev_line_item.name, v_prev_line_item.description,
        v_prev_line_item.category, v_prev_line_item.quantity,
        (v_item->>'consultant_response_price')::NUMERIC / GREATEST(v_prev_line_item.quantity, 1),
        (v_item->>'consultant_response_price')::NUMERIC,
        v_prev_line_item.is_optional, v_prev_line_item.display_order
      );
      
      UPDATE public.line_item_negotiations
      SET consultant_response_price = (v_item->>'consultant_response_price')::NUMERIC,
          consultant_note = v_item->>'consultant_note',
          updated_at = now()
      WHERE session_id = p_session_id
        AND line_item_id = (v_item->>'line_item_id')::UUID;
    END IF;
  END LOOP;
  
  -- 8. Update proposal status, current_version, price AND fee_line_items
  UPDATE public.proposals
  SET status = 'resubmitted',
      current_version = v_new_version_number,
      price = v_new_total,
      fee_line_items = COALESCE(v_updated_fee_line_items, fee_line_items),
      has_active_negotiation = false
  WHERE id = v_session.proposal_id;
  
  -- 9. Update negotiation_sessions status
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
$$;
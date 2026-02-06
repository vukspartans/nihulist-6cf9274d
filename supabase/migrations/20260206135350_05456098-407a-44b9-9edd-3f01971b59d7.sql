-- Fix: Add UUID validation before casting line_item_id in submit_negotiation_response
-- This prevents errors when line items use synthetic IDs like "idx-1" or "fee-1"

CREATE OR REPLACE FUNCTION public.submit_negotiation_response(
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
  v_new_version_id UUID;
  v_new_version_number INT;
  v_new_price NUMERIC;
  v_item JSONB;
  v_prev_line_item RECORD;
  v_updated_fee_items JSONB;
  v_item_id TEXT;
  v_is_valid_uuid BOOLEAN;
BEGIN
  -- Get session with proposal
  SELECT ns.*, p.id as proposal_id, p.price as proposal_price, p.current_version,
         p.fee_line_items, p.timeline_days, p.scope_text, p.terms, p.conditions_json
  INTO v_session
  FROM negotiation_sessions ns
  JOIN proposals p ON p.id = ns.proposal_id
  WHERE ns.id = p_session_id
    AND ns.status = 'awaiting_response';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negotiation session not found or not awaiting response';
  END IF;

  -- Calculate new total price from updated line items
  -- If no line items provided, use the session's target_total or original price
  IF jsonb_array_length(COALESCE(p_updated_line_items, '[]'::jsonb)) > 0 THEN
    SELECT COALESCE(SUM((item->>'consultant_response_price')::NUMERIC), 0)
    INTO v_new_price
    FROM jsonb_array_elements(p_updated_line_items) AS item;
  ELSE
    v_new_price := COALESCE(v_session.target_total, v_session.proposal_price);
  END IF;

  -- Ensure price is positive (database constraint)
  IF v_new_price <= 0 THEN
    v_new_price := 1;
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_new_version_number
  FROM proposal_versions
  WHERE proposal_id = v_session.proposal_id;

  -- Generate new version ID
  v_new_version_id := gen_random_uuid();

  -- Update fee_line_items JSONB in proposal with consultant responses
  -- This works for ALL item IDs (UUIDs, idx-*, fee-*, etc.)
  v_updated_fee_items := v_session.fee_line_items;
  
  IF v_updated_fee_items IS NOT NULL AND jsonb_array_length(COALESCE(p_updated_line_items, '[]'::jsonb)) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
    LOOP
      v_item_id := v_item->>'line_item_id';
      
      -- Update the matching item in fee_line_items by item_id or item_number
      v_updated_fee_items := (
        SELECT jsonb_agg(
          CASE 
            WHEN (elem->>'item_id' = v_item_id) 
                 OR (elem->>'item_number')::TEXT = REPLACE(v_item_id, 'idx-', '')
                 OR (elem->>'item_id' IS NULL AND elem->>'item_number' IS NULL AND v_item_id LIKE 'idx-%')
            THEN elem || jsonb_build_object(
              'consultant_response_price', (v_item->>'consultant_response_price')::NUMERIC,
              'consultant_note', v_item->>'consultant_note',
              'unit_price', (v_item->>'consultant_response_price')::NUMERIC / GREATEST(COALESCE((elem->>'quantity')::NUMERIC, 1), 1),
              'total', (v_item->>'consultant_response_price')::NUMERIC
            )
            ELSE elem
          END
        )
        FROM jsonb_array_elements(v_updated_fee_items) AS elem
      );
    END LOOP;
  END IF;

  -- Create new proposal version
  INSERT INTO proposal_versions (
    id, proposal_id, version_number, price, timeline_days,
    scope_text, terms, conditions_json, created_by, change_reason
  ) VALUES (
    v_new_version_id,
    v_session.proposal_id,
    v_new_version_number,
    v_new_price,
    v_session.timeline_days,
    v_session.scope_text,
    v_session.terms,
    v_session.conditions_json,
    (SELECT user_id FROM advisors WHERE id = v_session.consultant_advisor_id),
    'Negotiation response'
  );

  -- Process line item negotiations - ONLY for valid UUID line_item_ids
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
  LOOP
    v_item_id := v_item->>'line_item_id';
    
    -- Check if line_item_id is a valid UUID using regex
    v_is_valid_uuid := v_item_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    IF v_is_valid_uuid THEN
      -- Only attempt database lookup for valid UUIDs
      SELECT * INTO v_prev_line_item
      FROM proposal_line_items
      WHERE id = v_item_id::UUID;

      IF FOUND THEN
        -- Update or insert line_item_negotiations record
        INSERT INTO line_item_negotiations (
          session_id, line_item_id, adjustment_type, original_price,
          adjustment_value, initiator_target_price, consultant_response_price, consultant_note
        ) VALUES (
          p_session_id,
          v_item_id::UUID,
          'price_change',
          v_prev_line_item.total,
          (v_item->>'consultant_response_price')::NUMERIC - v_prev_line_item.total,
          v_prev_line_item.total,
          (v_item->>'consultant_response_price')::NUMERIC,
          v_item->>'consultant_note'
        )
        ON CONFLICT (session_id, line_item_id) DO UPDATE SET
          consultant_response_price = (v_item->>'consultant_response_price')::NUMERIC,
          consultant_note = v_item->>'consultant_note',
          updated_at = NOW();
      END IF;
    END IF;
    -- For non-UUID IDs (idx-*, fee-*, etc.), skip database operations
    -- The JSONB update above already handles these items
  END LOOP;

  -- Update proposal with new version and price
  UPDATE proposals SET
    current_version = v_new_version_number,
    price = v_new_price,
    fee_line_items = COALESCE(v_updated_fee_items, fee_line_items),
    status = 'resubmitted',
    updated_at = NOW()
  WHERE id = v_session.proposal_id;

  -- Update negotiation session
  UPDATE negotiation_sessions SET
    status = 'responded',
    negotiated_version_id = v_new_version_id,
    consultant_response_message = p_consultant_message,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'new_version_id', v_new_version_id,
    'new_version_number', v_new_version_number,
    'new_price', v_new_price
  );
END;
$$;
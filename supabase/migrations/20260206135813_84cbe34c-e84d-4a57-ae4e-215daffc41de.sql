-- Fix: Remove invalid updated_at reference from proposals UPDATE
-- The proposals table does not have an updated_at column

CREATE OR REPLACE FUNCTION public.submit_negotiation_response(
  p_session_id UUID,
  p_consultant_message TEXT,
  p_updated_line_items JSONB DEFAULT NULL,
  p_milestone_adjustments JSONB DEFAULT NULL,
  p_files JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_proposal RECORD;
  v_new_version_number INTEGER;
  v_new_version_id UUID;
  v_new_price NUMERIC;
  v_item JSONB;
  v_item_id TEXT;
  v_is_valid_uuid BOOLEAN;
  v_prev_line_item RECORD;
  v_updated_fee_items JSONB;
  v_file_ids UUID[];
BEGIN
  -- Get session with proposal info
  SELECT ns.*, p.fee_line_items, p.current_version, p.price as original_price
  INTO v_session
  FROM negotiation_sessions ns
  JOIN proposals p ON p.id = ns.proposal_id
  WHERE ns.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negotiation session not found';
  END IF;

  IF v_session.status != 'pending' THEN
    RAISE EXCEPTION 'Session is not in pending status';
  END IF;

  -- Calculate new version number
  v_new_version_number := COALESCE(v_session.current_version, 1) + 1;

  -- Calculate new price from updated line items or use original
  IF p_updated_line_items IS NOT NULL THEN
    SELECT COALESCE(SUM((item->>'total_price')::NUMERIC), 0)
    INTO v_new_price
    FROM jsonb_array_elements(p_updated_line_items) AS item;
  ELSE
    v_new_price := v_session.original_price;
  END IF;

  -- Update fee_line_items in proposals table based on the response
  IF p_updated_line_items IS NOT NULL AND v_session.fee_line_items IS NOT NULL THEN
    -- Build updated fee items by matching on description or item_id
    SELECT jsonb_agg(
      CASE 
        WHEN updated_item IS NOT NULL THEN
          original_item || jsonb_build_object(
            'unit_price', (updated_item->>'unit_price')::NUMERIC,
            'total_price', (updated_item->>'total_price')::NUMERIC,
            'quantity', COALESCE((updated_item->>'quantity')::NUMERIC, (original_item->>'quantity')::NUMERIC)
          )
        ELSE original_item
      END
    )
    INTO v_updated_fee_items
    FROM jsonb_array_elements(v_session.fee_line_items) AS original_item
    LEFT JOIN LATERAL (
      SELECT upd.*
      FROM jsonb_array_elements(p_updated_line_items) AS upd
      WHERE upd->>'description' = original_item->>'description'
         OR upd->>'line_item_id' = original_item->>'id'
      LIMIT 1
    ) AS updated_item ON true;
  END IF;

  -- Create new proposal version
  INSERT INTO proposal_versions (
    proposal_id,
    version_number,
    price,
    fee_line_items,
    milestone_payments,
    change_summary,
    created_by_role
  ) VALUES (
    v_session.proposal_id,
    v_new_version_number,
    v_new_price,
    COALESCE(v_updated_fee_items, v_session.fee_line_items),
    p_milestone_adjustments,
    p_consultant_message,
    'consultant'
  )
  RETURNING id INTO v_new_version_id;

  -- Process line item negotiations if provided
  IF p_updated_line_items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
    LOOP
      v_item_id := v_item->>'line_item_id';
      
      -- Check if the line_item_id is a valid UUID using regex
      v_is_valid_uuid := v_item_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      
      IF v_is_valid_uuid THEN
        -- Only attempt database lookup for valid UUIDs
        SELECT * INTO v_prev_line_item 
        FROM proposal_line_items 
        WHERE id = v_item_id::UUID;
        
        IF FOUND THEN
          -- Update or insert line item negotiation record
          INSERT INTO line_item_negotiations (
            session_id,
            line_item_id,
            original_price,
            initiator_target_price,
            consultant_response_price,
            consultant_note,
            adjustment_type,
            adjustment_value
          ) VALUES (
            p_session_id,
            v_item_id::UUID,
            v_prev_line_item.total_price,
            COALESCE((v_item->>'initiator_target_price')::NUMERIC, v_prev_line_item.total_price),
            (v_item->>'total_price')::NUMERIC,
            v_item->>'consultant_note',
            COALESCE(v_item->>'adjustment_type', 'fixed'),
            COALESCE((v_item->>'adjustment_value')::NUMERIC, 0)
          )
          ON CONFLICT (session_id, line_item_id) DO UPDATE SET
            consultant_response_price = EXCLUDED.consultant_response_price,
            consultant_note = EXCLUDED.consultant_note,
            updated_at = NOW();
        END IF;
      END IF;
      -- Non-UUID IDs are handled via JSONB updates only (already done above)
    END LOOP;
  END IF;

  -- Update proposal with new version and price (NO updated_at - column doesn't exist)
  UPDATE proposals SET
    current_version = v_new_version_number,
    price = v_new_price,
    fee_line_items = COALESCE(v_updated_fee_items, fee_line_items),
    status = 'resubmitted'
  WHERE id = v_session.proposal_id;

  -- Update session status
  UPDATE negotiation_sessions SET
    status = 'responded',
    responded_at = NOW(),
    consultant_response_message = p_consultant_message,
    milestone_adjustments = COALESCE(p_milestone_adjustments, milestone_adjustments),
    files = COALESCE(p_files, files),
    negotiated_version_id = v_new_version_id,
    updated_at = NOW()
  WHERE id = p_session_id;

  -- Mark any uploaded files as used
  IF p_files IS NOT NULL THEN
    SELECT ARRAY_AGG((f->>'id')::UUID)
    INTO v_file_ids
    FROM jsonb_array_elements(p_files) AS f
    WHERE f->>'id' IS NOT NULL;

    IF v_file_ids IS NOT NULL THEN
      UPDATE negotiation_files
      SET used_at = NOW(), session_id = p_session_id
      WHERE id = ANY(v_file_ids);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'version_id', v_new_version_id,
    'version_number', v_new_version_number,
    'new_price', v_new_price
  );
END;
$$;
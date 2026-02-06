-- Fix overload mismatch: make 3-arg submit_negotiation_response a safe wrapper
-- This prevents Supabase RPC from calling an outdated body that references proposals.updated_at

BEGIN;

-- 1) Remove the buggy 3-argument overload (exact signature)
DROP FUNCTION IF EXISTS public.submit_negotiation_response(uuid, jsonb, text);

-- 2) Recreate 3-arg overload as a thin wrapper to the canonical 5-arg function
CREATE OR REPLACE FUNCTION public.submit_negotiation_response(
  p_session_id uuid,
  p_updated_line_items jsonb,
  p_consultant_message text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delegate to canonical implementation (5-arg overload)
  RETURN public.submit_negotiation_response(
    p_session_id := p_session_id,
    p_consultant_message := p_consultant_message,
    p_updated_line_items := p_updated_line_items,
    p_milestone_adjustments := NULL,
    p_files := NULL
  );
END;
$$;

COMMENT ON FUNCTION public.submit_negotiation_response(uuid, jsonb, text)
IS 'Back-compat wrapper. Delegates to canonical 5-arg function; must not reference proposals.updated_at.';

COMMIT;
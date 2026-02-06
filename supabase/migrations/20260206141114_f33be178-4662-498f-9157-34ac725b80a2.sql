-- Drop the ambiguous 3-arg wrapper function that conflicts with the canonical 5-arg version
-- This resolves the "Could not choose the best candidate function" error
DROP FUNCTION IF EXISTS public.submit_negotiation_response(uuid, jsonb, text);
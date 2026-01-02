-- Fix magic_links security: Remove overly permissive SELECT policy
-- The "Anyone can validate tokens" policy allows unrestricted access to ALL tokens

-- Step 1: Drop the dangerous policy
DROP POLICY IF EXISTS "Anyone can validate tokens" ON public.magic_links;

-- Step 2: Create a SECURITY DEFINER function for secure token validation
-- This allows token validation without exposing the table
CREATE OR REPLACE FUNCTION public.validate_magic_link(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_record RECORD;
BEGIN
  -- Find the token
  SELECT id, user_id, purpose, email, expires_at, used_at, metadata
  INTO link_record
  FROM magic_links
  WHERE token = p_token;
  
  -- Token not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token not found');
  END IF;
  
  -- Token already used
  IF link_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token already used');
  END IF;
  
  -- Token expired
  IF link_record.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token expired');
  END IF;
  
  -- Token is valid - return safe metadata (not the token itself)
  RETURN jsonb_build_object(
    'valid', true,
    'link_id', link_record.id,
    'user_id', link_record.user_id,
    'purpose', link_record.purpose,
    'email', link_record.email,
    'expires_at', link_record.expires_at
  );
END;
$$;

-- Step 3: Create a function to mark token as used (also SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.use_magic_link(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_record RECORD;
BEGIN
  -- Find and validate the token
  SELECT id, user_id, purpose, expires_at, used_at
  INTO link_record
  FROM magic_links
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token not found');
  END IF;
  
  IF link_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token already used');
  END IF;
  
  IF link_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token expired');
  END IF;
  
  -- Mark as used
  UPDATE magic_links
  SET used_at = now()
  WHERE id = link_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', link_record.user_id,
    'purpose', link_record.purpose
  );
END;
$$;

-- Step 4: Users can only view their own tokens (for display purposes)
CREATE POLICY "Users can view their own magic links"
ON public.magic_links FOR SELECT
USING (user_id = auth.uid());

-- Grant execute permissions on the validation functions
GRANT EXECUTE ON FUNCTION public.validate_magic_link(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_magic_link(TEXT) TO anon, authenticated;
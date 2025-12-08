-- Fix double-encoded request_files data in rfp_invites
-- Convert JSON strings stored in JSONB column to proper JSONB arrays

UPDATE public.rfp_invites
SET request_files = (request_files #>> '{}')::jsonb
WHERE request_files IS NOT NULL
  AND jsonb_typeof(request_files) = 'string'
  AND request_files::text != '""'
  AND request_files::text != '"[]"';
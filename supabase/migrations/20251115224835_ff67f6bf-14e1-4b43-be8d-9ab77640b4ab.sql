-- FORCE FIX: Drop and recreate RLS policies for rfp-request-files
-- The previous migration didn't apply correctly due to caching

-- Force drop all entrepreneur policies (use CASCADE if needed)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Entrepreneurs can upload files to their projects" ON storage.objects CASCADE;
  DROP POLICY IF EXISTS "Entrepreneurs can view their project files" ON storage.objects CASCADE;
  DROP POLICY IF EXISTS "Entrepreneurs can delete their project files" ON storage.objects CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Wait a moment for cache to clear
SELECT pg_sleep(0.1);

-- Create CORRECTED INSERT policy (using storage.foldername(name), not p.name)
CREATE POLICY "Entrepreneurs can upload files to their projects"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text 
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  )
);

-- Create CORRECTED SELECT policy
CREATE POLICY "Entrepreneurs can view their project files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text 
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  )
);

-- Create CORRECTED DELETE policy
CREATE POLICY "Entrepreneurs can delete their project files"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text 
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  )
);

-- Verify the policies were created correctly
SELECT 
  policyname,
  CASE 
    WHEN with_check IS NULL THEN qual::text
    ELSE with_check::text
  END as policy_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%Entrepreneurs%'
ORDER BY policyname;
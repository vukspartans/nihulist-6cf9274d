-- Fix RLS policies for rfp-request-files bucket
-- Bug: policies were using storage.foldername(p.name) instead of storage.foldername(name)
-- This caused them to check project NAME instead of the file PATH

-- Drop existing broken policies
DROP POLICY IF EXISTS "Entrepreneurs can upload files to their projects" ON storage.objects;
DROP POLICY IF EXISTS "Entrepreneurs can view their project files" ON storage.objects;
DROP POLICY IF EXISTS "Entrepreneurs can delete their project files" ON storage.objects;

-- Create corrected INSERT policy
CREATE POLICY "Entrepreneurs can upload files to their projects"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = p.id::text
  )
);

-- Create corrected SELECT policy
CREATE POLICY "Entrepreneurs can view their project files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = p.id::text
  )
);

-- Create corrected DELETE policy
CREATE POLICY "Entrepreneurs can delete their project files"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = p.id::text
  )
);
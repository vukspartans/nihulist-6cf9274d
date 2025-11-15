-- Fix proposal file upload RLS policy to allow temp folder uploads
-- This resolves the "new row violates row-level security policy" error

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Advisors can upload proposal files" ON storage.objects;

-- Create new policy allowing advisors to upload to:
-- 1. Their advisor-scoped temp folder (temp-{advisorId}/*) for drafts
-- 2. Submitted proposal folders ({proposalId}/*) after submission
CREATE POLICY "Advisors can upload proposal files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'proposal-files' 
  AND (
    -- Allow upload to advisor's temp folder for drafts
    -- Format: temp-{advisorId}/{filename}
    (storage.foldername(name))[1] LIKE 'temp-%'
    AND (storage.foldername(name))[1] = CONCAT('temp-', (
      SELECT a.id::text 
      FROM advisors a 
      WHERE a.user_id = auth.uid()
    ))
    OR
    -- Allow upload to submitted proposal folder
    -- Format: {proposalId}/{filename}
    auth.uid() IN (
      SELECT a.user_id
      FROM advisors a
      JOIN proposals p ON p.advisor_id = a.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- Policy for deleting files (both temp and proposal folders)
DROP POLICY IF EXISTS "Advisors can delete their proposal files" ON storage.objects;

CREATE POLICY "Advisors can delete their proposal files"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'proposal-files'
  AND (
    -- Can delete from their temp folder
    (storage.foldername(name))[1] LIKE 'temp-%'
    AND (storage.foldername(name))[1] = CONCAT('temp-', (
      SELECT a.id::text 
      FROM advisors a 
      WHERE a.user_id = auth.uid()
    ))
    OR
    -- Can delete from their submitted proposals
    auth.uid() IN (
      SELECT a.user_id
      FROM advisors a
      JOIN proposals p ON p.advisor_id = a.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- Policy for reading files (advisors and entrepreneurs)
DROP POLICY IF EXISTS "Users can view relevant proposal files" ON storage.objects;

CREATE POLICY "Users can view relevant proposal files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'proposal-files'
  AND (
    -- Advisors can view their temp folders
    (storage.foldername(name))[1] LIKE 'temp-%'
    AND (storage.foldername(name))[1] = CONCAT('temp-', (
      SELECT a.id::text 
      FROM advisors a 
      WHERE a.user_id = auth.uid()
    ))
    OR
    -- Advisors can view their submitted proposal files
    auth.uid() IN (
      SELECT a.user_id
      FROM advisors a
      JOIN proposals p ON p.advisor_id = a.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
    OR
    -- Entrepreneurs can view files for their projects
    auth.uid() IN (
      SELECT proj.owner_id
      FROM proposals p
      JOIN projects proj ON proj.id = p.project_id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
  )
);
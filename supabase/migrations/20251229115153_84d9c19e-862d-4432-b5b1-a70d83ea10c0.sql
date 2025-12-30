-- Drop the buggy policies
DROP POLICY IF EXISTS "Entrepreneurs can upload negotiation files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view negotiation files" ON storage.objects;
DROP POLICY IF EXISTS "Entrepreneurs can delete negotiation files" ON storage.objects;

-- Recreate INSERT policy with correct reference
CREATE POLICY "Entrepreneurs can upload negotiation files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'negotiation-files' AND
  auth.uid() IN (
    SELECT pr.owner_id 
    FROM public.projects pr
    JOIN public.proposals p ON p.project_id = pr.id
    WHERE (storage.foldername(name))[1] = p.id::text
  )
);

-- Recreate SELECT policy with correct reference
CREATE POLICY "Users can view negotiation files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'negotiation-files' AND
  (
    -- Entrepreneurs can view files for proposals on their projects
    auth.uid() IN (
      SELECT pr.owner_id 
      FROM public.projects pr
      JOIN public.proposals p ON p.project_id = pr.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
    OR
    -- Advisors can view files for proposals they submitted
    auth.uid() IN (
      SELECT a.user_id 
      FROM public.advisors a
      JOIN public.proposals p ON p.advisor_id = a.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- Recreate DELETE policy with correct reference
CREATE POLICY "Entrepreneurs can delete negotiation files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'negotiation-files' AND
  auth.uid() IN (
    SELECT pr.owner_id 
    FROM public.projects pr
    JOIN public.proposals p ON p.project_id = pr.id
    WHERE (storage.foldername(name))[1] = p.id::text
  )
);
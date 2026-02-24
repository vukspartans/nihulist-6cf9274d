DROP POLICY IF EXISTS "Invited advisors can read project files" ON storage.objects;

CREATE POLICY "Invited advisors can read project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM rfp_invites ri
    JOIN advisors a ON a.id = ri.advisor_id
    JOIN rfps r ON r.id = ri.rfp_id
    JOIN projects p ON p.id = r.project_id
    WHERE a.user_id = auth.uid()
      AND (p.id)::text = (storage.foldername(name))[1]
  )
);
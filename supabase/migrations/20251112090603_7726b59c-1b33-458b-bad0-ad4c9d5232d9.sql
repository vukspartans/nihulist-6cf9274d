-- Phase 1: Update RLS policies for rfp-request-files storage bucket
-- Drop old RFP-based policies
DROP POLICY IF EXISTS "Advisors can view their RFP request files" ON storage.objects;
DROP POLICY IF EXISTS "Entrepreneurs can upload RFP request files" ON storage.objects;
DROP POLICY IF EXISTS "Entrepreneurs can delete their RFP request files" ON storage.objects;
DROP POLICY IF EXISTS "Entrepreneurs can view RFP request files" ON storage.objects;

-- New policy: Entrepreneurs can upload files to their projects
CREATE POLICY "Entrepreneurs can upload files to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = p.id::text
  )
);

-- New policy: Entrepreneurs can view their project files
CREATE POLICY "Entrepreneurs can view their project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = p.id::text
  )
);

-- New policy: Entrepreneurs can delete their project files
CREATE POLICY "Entrepreneurs can delete their project files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = p.id::text
  )
);

-- New policy: Advisors can view files for RFPs they're invited to
CREATE POLICY "Advisors can view invited RFP files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rfp-request-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 
    FROM public.rfp_invites ri
    JOIN public.advisors a ON a.id = ri.advisor_id
    JOIN public.rfps r ON r.id = ri.rfp_id
    WHERE a.user_id = auth.uid()
    AND ri.request_files::text LIKE '%' || name || '%'
  )
);
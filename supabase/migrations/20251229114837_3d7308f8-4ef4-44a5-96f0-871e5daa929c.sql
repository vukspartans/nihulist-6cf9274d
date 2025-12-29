-- Create negotiation-files bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('negotiation-files', 'negotiation-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Entrepreneurs can upload negotiation files for their project proposals
CREATE POLICY "Entrepreneurs can upload negotiation files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'negotiation-files' AND
  auth.uid() IN (
    SELECT pr.owner_id FROM public.projects pr
    JOIN public.proposals p ON p.project_id = pr.id
    WHERE (storage.foldername(name))[1] = p.id::text
  )
);

-- RLS Policy: View access for entrepreneurs and advisors
CREATE POLICY "Users can view negotiation files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'negotiation-files' AND
  (
    auth.uid() IN (
      SELECT pr.owner_id FROM public.projects pr
      JOIN public.proposals p ON p.project_id = pr.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
    OR
    auth.uid() IN (
      SELECT a.user_id FROM public.advisors a
      JOIN public.proposals p ON p.advisor_id = a.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- RLS Policy: Entrepreneurs can delete their own negotiation files
CREATE POLICY "Entrepreneurs can delete negotiation files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'negotiation-files' AND
  auth.uid() IN (
    SELECT pr.owner_id FROM public.projects pr
    JOIN public.proposals p ON p.project_id = pr.id
    WHERE (storage.foldername(name))[1] = p.id::text
  )
);

-- Admin full access
CREATE POLICY "Admins have full access to negotiation files"
ON storage.objects FOR ALL
USING (bucket_id = 'negotiation-files' AND has_role(auth.uid(), 'admin'::app_role));
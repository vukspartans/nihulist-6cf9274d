-- Phase 2: Add missing RLS policies

-- Allow advisors to mark RFP as 'in_progress' when they start working
CREATE POLICY "Advisors can mark RFP in progress"
ON public.rfp_invites
FOR UPDATE
TO authenticated
USING (
  advisor_id IN (
    SELECT id FROM public.advisors WHERE user_id = auth.uid()
  )
  AND status IN ('sent', 'opened')
)
WITH CHECK (
  status = 'in_progress'
);

-- Allow advisors to withdraw their proposals before review
CREATE POLICY "Advisors can withdraw submitted proposals"
ON public.proposals
FOR UPDATE
TO authenticated
USING (
  advisor_id IN (
    SELECT id FROM public.advisors WHERE user_id = auth.uid()
  )
  AND status = 'submitted'
)
WITH CHECK (
  status = 'withdrawn'
);

-- Entrepreneurs can view proposal files for their projects
CREATE POLICY "Entrepreneurs view proposal files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'proposal-files'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.proposals p
    JOIN public.projects proj ON proj.id = p.project_id
    WHERE proj.owner_id = auth.uid()
  )
);
-- Allow advisors to view profiles of entrepreneurs who have invited them to RFPs
CREATE POLICY "Advisors can view entrepreneur profiles for invited projects"
ON public.profiles
FOR SELECT
USING (
  -- User viewing is an advisor
  EXISTS (
    SELECT 1 FROM public.advisors a WHERE a.user_id = auth.uid()
  )
  AND
  -- Profile belongs to an entrepreneur who owns a project that advisor was invited to
  user_id IN (
    SELECT DISTINCT proj.owner_id
    FROM public.rfp_invites ri
    JOIN public.rfps r ON r.id = ri.rfp_id
    JOIN public.projects proj ON proj.id = r.project_id
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
  )
);
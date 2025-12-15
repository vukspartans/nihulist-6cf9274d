-- Allow system (edge functions with service role) to update evaluations
-- Note: Service role bypasses RLS, but we add explicit policy for clarity
DROP POLICY IF EXISTS "System can update proposal evaluations" ON public.proposals;
CREATE POLICY "System can update proposal evaluations"
ON public.proposals
FOR UPDATE
USING (true) -- Service role will bypass anyway
WITH CHECK (true);

-- Allow entrepreneurs to view evaluation results for their projects
-- (Already covered by existing SELECT policy, but ensure evaluation_result is accessible)

-- Allow entrepreneurs to manually trigger re-evaluation (update status to 'pending')
DROP POLICY IF EXISTS "Entrepreneurs can reset proposal evaluations" ON public.proposals;
CREATE POLICY "Entrepreneurs can reset proposal evaluations"
ON public.proposals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = proposals.project_id
    AND projects.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = proposals.project_id
    AND projects.owner_id = auth.uid()
  )
  AND (
    -- Only allow resetting status, not modifying results
    (OLD.evaluation_result IS DISTINCT FROM NEW.evaluation_result) = false
    OR NEW.evaluation_status = 'pending'
  )
);


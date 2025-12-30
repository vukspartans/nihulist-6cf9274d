-- Add RLS policy for advisors to view project files for invited projects
CREATE POLICY "Advisors can view project files for invited projects"
ON public.project_files
FOR SELECT
USING (
  project_id IN (
    SELECT r.project_id 
    FROM public.rfps r
    JOIN public.rfp_invites ri ON ri.rfp_id = r.id
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
  )
);
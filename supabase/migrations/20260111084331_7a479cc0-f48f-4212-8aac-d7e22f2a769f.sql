-- Allow advisors to view company information for entrepreneurs who invited them
CREATE POLICY "Advisors can view entrepreneur companies for invited projects"
ON public.companies
FOR SELECT
USING (
  id IN (
    SELECT p.organization_id 
    FROM profiles p
    JOIN projects proj ON proj.owner_id = p.user_id
    JOIN rfps r ON r.project_id = proj.id
    JOIN rfp_invites ri ON ri.rfp_id = r.id
    JOIN advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
      AND p.organization_id IS NOT NULL
  )
);
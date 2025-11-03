-- Allow advisors to view RFPs they've been invited to
CREATE POLICY advisors_view_invited_rfps
ON rfps
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM rfp_invites ri
    JOIN advisors a ON a.id = ri.advisor_id
    WHERE ri.rfp_id = rfps.id
      AND a.user_id = auth.uid()
  )
);

-- Allow advisors to view projects for which they have RFP invites
CREATE POLICY advisors_view_invited_projects
ON projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM rfps r
    JOIN rfp_invites ri ON ri.rfp_id = r.id
    JOIN advisors a ON a.id = ri.advisor_id
    WHERE r.project_id = projects.id
      AND a.user_id = auth.uid()
  )
);
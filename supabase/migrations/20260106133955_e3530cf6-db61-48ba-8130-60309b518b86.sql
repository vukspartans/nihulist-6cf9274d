-- Track bulk negotiation batches
CREATE TABLE IF NOT EXISTS bulk_negotiation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL,
  reduction_type TEXT NOT NULL CHECK (reduction_type IN ('percent', 'fixed')),
  reduction_value NUMERIC NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which proposals were in each batch
CREATE TABLE IF NOT EXISTS bulk_negotiation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES bulk_negotiation_batches(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  session_id UUID REFERENCES negotiation_sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, proposal_id)
);

-- Add column to track if negotiation session was part of bulk
ALTER TABLE negotiation_sessions 
ADD COLUMN IF NOT EXISTS bulk_batch_id UUID REFERENCES bulk_negotiation_batches(id);

-- Enable RLS
ALTER TABLE bulk_negotiation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_negotiation_members ENABLE ROW LEVEL SECURITY;

-- Policies for project owners - bulk_negotiation_batches
CREATE POLICY "Project owners can view bulk batches"
ON bulk_negotiation_batches FOR SELECT
TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Project owners can create bulk batches"
ON bulk_negotiation_batches FOR INSERT
TO authenticated
WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- Policies for project owners - bulk_negotiation_members
CREATE POLICY "Project owners can view bulk members"
ON bulk_negotiation_members FOR SELECT
TO authenticated
USING (batch_id IN (
  SELECT id FROM bulk_negotiation_batches 
  WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
));

CREATE POLICY "Project owners can create bulk members"
ON bulk_negotiation_members FOR INSERT
TO authenticated
WITH CHECK (batch_id IN (
  SELECT id FROM bulk_negotiation_batches 
  WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_bulk_negotiation_batches_project ON bulk_negotiation_batches(project_id);
CREATE INDEX IF NOT EXISTS idx_bulk_negotiation_members_batch ON bulk_negotiation_members(batch_id);
CREATE INDEX IF NOT EXISTS idx_bulk_negotiation_members_proposal ON bulk_negotiation_members(proposal_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_bulk_batch ON negotiation_sessions(bulk_batch_id);
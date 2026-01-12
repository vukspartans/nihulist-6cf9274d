-- Create table to track negotiation files with original names
CREATE TABLE public.negotiation_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  session_id UUID REFERENCES negotiation_sessions(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  UNIQUE(storage_path)
);

-- Enable RLS
ALTER TABLE public.negotiation_files ENABLE ROW LEVEL SECURITY;

-- Users can manage their own uploaded files
CREATE POLICY "Users can manage their own uploaded files"
ON public.negotiation_files FOR ALL
USING (uploaded_by = auth.uid());

-- Project owners can view proposal files
CREATE POLICY "Project owners can view proposal files"
ON public.negotiation_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    JOIN projects pr ON pr.id = p.project_id
    WHERE p.id = negotiation_files.proposal_id AND pr.owner_id = auth.uid()
  )
);

-- Advisors can view files for their proposals
CREATE POLICY "Advisors can view files for their proposals"
ON public.negotiation_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    JOIN advisors a ON a.id = p.advisor_id
    WHERE p.id = negotiation_files.proposal_id AND a.user_id = auth.uid()
  )
);

-- Index for cleanup query
CREATE INDEX idx_negotiation_files_unused 
ON public.negotiation_files (uploaded_at) 
WHERE session_id IS NULL AND used_at IS NULL;

-- Index for session lookup
CREATE INDEX idx_negotiation_files_session 
ON public.negotiation_files (session_id) 
WHERE session_id IS NOT NULL;
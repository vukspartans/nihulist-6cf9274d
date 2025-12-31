-- Add rfp_invite_id column to proposals table
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS rfp_invite_id UUID REFERENCES public.rfp_invites(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_proposals_rfp_invite_id ON public.proposals(rfp_invite_id);

-- Add unique constraint to prevent duplicate active proposals per invite
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_unique_active_per_invite 
ON public.proposals(rfp_invite_id) 
WHERE rfp_invite_id IS NOT NULL AND status NOT IN ('withdrawn', 'rejected');

-- Backfill legacy proposals: match to the invite with closest created_at before submitted_at
UPDATE public.proposals p
SET rfp_invite_id = (
  SELECT ri.id 
  FROM public.rfp_invites ri
  JOIN public.rfps r ON r.id = ri.rfp_id
  WHERE ri.advisor_id = p.advisor_id
    AND r.project_id = p.project_id
    AND ri.created_at <= p.submitted_at
  ORDER BY ri.created_at DESC
  LIMIT 1
)
WHERE p.rfp_invite_id IS NULL;
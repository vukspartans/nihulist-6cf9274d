-- Phase 1 & 5: Add database constraints and performance indexes

-- Make critical proposal fields NOT NULL
ALTER TABLE public.proposals
  ALTER COLUMN project_id SET NOT NULL,
  ALTER COLUMN advisor_id SET NOT NULL;

-- Positive price validation
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_price_positive CHECK (price > 0);

-- Reasonable timeline (1 day to 10 years)
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_timeline_reasonable 
  CHECK (timeline_days > 0 AND timeline_days <= 3650);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_proposals_project_status ON public.proposals(project_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_advisor_status ON public.proposals(advisor_id, status);

CREATE INDEX IF NOT EXISTS idx_rfp_invites_advisor_status 
ON public.rfp_invites(advisor_id, status);

CREATE INDEX IF NOT EXISTS idx_rfp_invites_deadline 
ON public.rfp_invites(deadline_at) 
WHERE status IN ('sent', 'opened', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_activity_log_entity 
ON public.activity_log(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signatures_entity 
ON public.signatures(entity_type, entity_id);
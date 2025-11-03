-- HIGH PRIORITY: Schema Cleanup & RLS Policies

-- 1. Add RLS policy for entrepreneurs to update proposals
CREATE POLICY "Entrepreneurs can update proposals for their projects"
ON public.proposals
FOR UPDATE
TO authenticated
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
);

-- 2. Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_rfp_invites_rfp_advisor 
ON public.rfp_invites(rfp_id, advisor_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_advisors_project_advisor 
ON public.project_advisors(project_id, advisor_id);

-- 3. Add status tracking field to rfp_invites (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rfp_invites' 
    AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE public.rfp_invites ADD COLUMN opened_at timestamptz;
  END IF;
END $$;

-- 4. Add status transition validation for proposals
CREATE OR REPLACE FUNCTION public.validate_proposal_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow any initial status on INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Valid transitions
  -- submitted -> accepted, rejected, withdrawn
  -- accepted -> completed, cancelled
  -- rejected -> (no further transitions)
  -- withdrawn -> (no further transitions)
  
  IF OLD.status = 'submitted' AND NEW.status NOT IN ('submitted', 'accepted', 'rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  IF OLD.status = 'accepted' AND NEW.status NOT IN ('accepted', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  IF OLD.status IN ('rejected', 'withdrawn', 'completed', 'cancelled') AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status from terminal state %', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the trigger
DROP TRIGGER IF EXISTS validate_proposal_status ON public.proposals;
CREATE TRIGGER validate_proposal_status
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_proposal_status_transition();

-- 5. Add foreign key cascades
ALTER TABLE public.project_advisors
  DROP CONSTRAINT IF EXISTS project_advisors_project_id_fkey,
  ADD CONSTRAINT project_advisors_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_advisors
  DROP CONSTRAINT IF EXISTS project_advisors_advisor_id_fkey,
  ADD CONSTRAINT project_advisors_advisor_id_fkey 
    FOREIGN KEY (advisor_id) REFERENCES public.advisors(id) ON DELETE CASCADE;

ALTER TABLE public.proposals
  DROP CONSTRAINT IF EXISTS proposals_project_id_fkey,
  ADD CONSTRAINT proposals_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.proposals
  DROP CONSTRAINT IF EXISTS proposals_advisor_id_fkey,
  ADD CONSTRAINT proposals_advisor_id_fkey 
    FOREIGN KEY (advisor_id) REFERENCES public.advisors(id) ON DELETE CASCADE;
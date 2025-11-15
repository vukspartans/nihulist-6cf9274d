-- Fix proposal status transition validation - remove invalid enum values
-- This migration fixes the validate_proposal_status_transition trigger that was
-- referencing 'completed' and 'cancelled' which are not valid proposal_status enum values

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

  -- Valid proposal_status enum values:
  -- 'draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'
  
  -- Valid transitions:
  -- draft -> submitted, under_review
  -- submitted -> accepted, rejected, withdrawn, under_review
  -- under_review -> submitted, accepted, rejected
  -- accepted -> (terminal state - no further transitions)
  -- rejected -> (terminal state - no further transitions)
  -- withdrawn -> (terminal state - no further transitions)
  
  -- Validate draft transitions
  IF OLD.status = 'draft' AND NEW.status NOT IN ('draft', 'submitted', 'under_review') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Validate submitted transitions
  IF OLD.status = 'submitted' AND NEW.status NOT IN ('submitted', 'accepted', 'rejected', 'withdrawn', 'under_review') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Validate under_review transitions
  IF OLD.status = 'under_review' AND NEW.status NOT IN ('under_review', 'submitted', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Terminal states: accepted, rejected, withdrawn cannot transition to anything else
  IF OLD.status IN ('accepted', 'rejected', 'withdrawn') AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status from terminal state %', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$$;
-- Update the proposal status transition validation function to allow negotiation statuses
CREATE OR REPLACE FUNCTION public.validate_proposal_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow any initial status on INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Valid proposal_status enum values:
  -- 'draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn', 'negotiation_requested', 'resubmitted'
  
  -- Validate draft transitions
  IF OLD.status = 'draft' AND NEW.status NOT IN ('draft', 'submitted', 'under_review') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Validate submitted transitions (now allows negotiation_requested and resubmitted)
  IF OLD.status = 'submitted' AND NEW.status NOT IN ('submitted', 'accepted', 'rejected', 'withdrawn', 'under_review', 'negotiation_requested', 'resubmitted') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Validate under_review transitions
  IF OLD.status = 'under_review' AND NEW.status NOT IN ('under_review', 'submitted', 'accepted', 'rejected', 'negotiation_requested', 'resubmitted') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Validate negotiation_requested transitions
  IF OLD.status = 'negotiation_requested' AND NEW.status NOT IN ('negotiation_requested', 'submitted', 'resubmitted', 'accepted', 'rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Validate resubmitted transitions
  IF OLD.status = 'resubmitted' AND NEW.status NOT IN ('resubmitted', 'submitted', 'accepted', 'rejected', 'negotiation_requested', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Terminal states: accepted, rejected, withdrawn cannot transition to anything else
  IF OLD.status IN ('accepted', 'rejected', 'withdrawn') AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status from terminal state %', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$function$;
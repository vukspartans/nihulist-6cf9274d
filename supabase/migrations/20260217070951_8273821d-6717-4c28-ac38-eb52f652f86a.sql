CREATE OR REPLACE FUNCTION public.validate_proposal_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT deadline_at, status INTO v_invite
  FROM public.rfp_invites
  WHERE rfp_id = (
    SELECT rfp_id FROM public.rfp_invites
    WHERE advisor_id = NEW.advisor_id
    AND rfp_id IN (
      SELECT id FROM public.rfps WHERE project_id = NEW.project_id
    )
    LIMIT 1
  );

  IF FOUND THEN
    IF v_invite.deadline_at IS NOT NULL AND v_invite.deadline_at < NOW() THEN
      RAISE EXCEPTION 'Cannot submit proposal: deadline has expired at %', v_invite.deadline_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
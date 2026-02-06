-- Update expire_old_rfp_invites to skip invites with active negotiations
-- This prevents RFP invites from expiring when there's an ongoing negotiation session

CREATE OR REPLACE FUNCTION public.expire_old_rfp_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.rfp_invites ri
  SET status = 'expired'::public.rfp_invite_status
  WHERE ri.status IN ('pending', 'sent', 'opened')
    AND ri.deadline_at < now()
    AND ri.deadline_at IS NOT NULL
    -- Don't expire if there's an active negotiation for this invite
    AND NOT EXISTS (
      SELECT 1 
      FROM proposals p
      JOIN negotiation_sessions ns ON ns.proposal_id = p.id
      WHERE p.rfp_invite_id = ri.id
        AND ns.status IN ('awaiting_response', 'open')
    );
END;
$$;
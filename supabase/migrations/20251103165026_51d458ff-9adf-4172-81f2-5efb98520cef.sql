-- Add a simplified RLS policy for advisors to view their own invites directly
-- This bypasses the need for the helper function in the common case

CREATE POLICY "Advisors can view their own invites by advisor_id"
ON public.rfp_invites
FOR SELECT
USING (
  advisor_id IN (
    SELECT id FROM public.advisors WHERE user_id = auth.uid()
  )
);
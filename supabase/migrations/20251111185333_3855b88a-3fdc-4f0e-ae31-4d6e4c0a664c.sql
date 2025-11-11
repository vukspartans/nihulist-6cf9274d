-- Fix RESTRICTIVE RLS policy blocking entrepreneurs from viewing their RFPs
-- Drop the existing RESTRICTIVE policy
DROP POLICY IF EXISTS "advisors_can_view_their_invited_rfps_direct" ON public.rfps;

-- Recreate as PERMISSIVE policy to allow entrepreneurs AND advisors to view their respective RFPs
CREATE POLICY "advisors_can_view_their_invited_rfps_direct"
ON public.rfps FOR SELECT
USING (
  id IN (
    SELECT ri.rfp_id
    FROM public.rfp_invites ri
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
  )
);

-- Fix RLS policy on fee_submission_methods to use has_role() instead of profiles.role
DROP POLICY IF EXISTS "Admins can manage submission methods" ON public.fee_submission_methods;

CREATE POLICY "Admins can manage submission methods"
ON public.fee_submission_methods
FOR ALL
USING (
  has_role(auth.uid(), 'admin')
);

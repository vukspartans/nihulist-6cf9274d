
-- Fix RLS policy on fee_template_categories to use user_roles table instead of profiles
DROP POLICY IF EXISTS "Admins can manage categories" ON public.fee_template_categories;

CREATE POLICY "Admins can manage categories"
ON public.fee_template_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);

-- Create security definer function to check company ownership
CREATE OR REPLACE FUNCTION public.is_company_owner(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE company_id = _company_id
      AND user_id = _user_id
      AND role = 'owner'
  );
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Company owners can manage members" ON public.company_members;

-- Create new non-recursive policy using the security definer function
CREATE POLICY "Company owners can manage members"
ON public.company_members
FOR ALL
TO authenticated
USING (public.is_company_owner(company_id, auth.uid()));

-- Ensure users can still insert themselves as members
-- Keep existing policy for self-insertion
-- (already exists: "Users can insert themselves as company members")

-- Update the view policy to also use the function for consistency
DROP POLICY IF EXISTS "Users can view their company memberships" ON public.company_members;

CREATE POLICY "Users can view their company memberships"
ON public.company_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.is_company_owner(company_id, auth.uid())
);
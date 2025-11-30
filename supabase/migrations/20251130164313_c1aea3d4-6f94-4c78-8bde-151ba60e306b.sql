-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Advisors can view entrepreneur profiles for invited projects" ON public.profiles;

-- Step 2: Create security definer function to check if user is an advisor
CREATE OR REPLACE FUNCTION public.is_user_advisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.advisors
    WHERE user_id = _user_id
  )
$$;

-- Step 3: Recreate the policy using the security definer function
CREATE POLICY "Advisors can view entrepreneur profiles for invited projects"
ON public.profiles
FOR SELECT
USING (
  -- User viewing is an advisor (using security definer function to avoid recursion)
  public.is_user_advisor(auth.uid())
  AND
  -- Profile belongs to an entrepreneur who owns a project that advisor was invited to
  user_id IN (
    SELECT DISTINCT proj.owner_id
    FROM public.rfp_invites ri
    JOIN public.rfps r ON r.id = ri.rfp_id
    JOIN public.projects proj ON proj.id = r.project_id
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
  )
);
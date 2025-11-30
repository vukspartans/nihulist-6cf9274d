-- Step 1: Create security definer function to check if user is an entrepreneur
CREATE OR REPLACE FUNCTION public.is_user_entrepreneur(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Check user_roles table (proper RBAC)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'entrepreneur'::app_role
  )
  -- Fallback: also check profiles.role for backward compatibility
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
    AND role = 'entrepreneur'
  )
$$;

-- Step 2: Drop and recreate advisors policy to use security definer function
DROP POLICY IF EXISTS "Entrepreneurs can view active advisors for recommendations" ON public.advisors;

CREATE POLICY "Entrepreneurs can view active advisors for recommendations"
ON public.advisors
FOR SELECT
USING (
  (is_active = true) AND public.is_user_entrepreneur(auth.uid())
);

-- Step 3: Create comprehensive security definer function for checking advisor invitations
CREATE OR REPLACE FUNCTION public.is_advisor_invited_to_entrepreneur(_entrepreneur_user_id uuid, _advisor_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rfp_invites ri
    JOIN public.rfps r ON r.id = ri.rfp_id
    JOIN public.projects proj ON proj.id = r.project_id
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE proj.owner_id = _entrepreneur_user_id
    AND a.user_id = _advisor_user_id
  )
$$;

-- Step 4: Update profiles policy to use both security definer functions
DROP POLICY IF EXISTS "Advisors can view entrepreneur profiles for invited projects" ON public.profiles;

CREATE POLICY "Advisors can view entrepreneur profiles for invited projects"
ON public.profiles
FOR SELECT
USING (
  -- Current user is an advisor (using security definer function)
  public.is_user_advisor(auth.uid())
  AND
  -- Advisor was invited to a project owned by this profile's user (using security definer function)
  public.is_advisor_invited_to_entrepreneur(user_id, auth.uid())
);
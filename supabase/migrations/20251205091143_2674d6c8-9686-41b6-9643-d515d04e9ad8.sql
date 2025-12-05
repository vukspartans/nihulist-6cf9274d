-- Fix all security definer functions to break RLS recursion chain

-- Step 1: Fix is_user_advisor() to query ONLY user_roles
CREATE OR REPLACE FUNCTION public.is_user_advisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'advisor'::app_role
  )
$$;

-- Step 2: Fix is_user_entrepreneur() to query ONLY user_roles
CREATE OR REPLACE FUNCTION public.is_user_entrepreneur(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'entrepreneur'::app_role
  )
$$;

-- Step 3: Create helper function to get advisor_id from user_id
CREATE OR REPLACE FUNCTION public.get_advisor_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.advisors WHERE user_id = _user_id LIMIT 1
$$;

-- Step 4: Fix is_advisor_invited_to_entrepreneur() to use helper function
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
    WHERE proj.owner_id = _entrepreneur_user_id
    AND ri.advisor_id = public.get_advisor_id_for_user(_advisor_user_id)
  )
$$;
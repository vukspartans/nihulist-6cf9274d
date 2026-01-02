
-- Fix activity_log RLS policies to prevent unauthorized access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view activity for their projects" ON public.activity_log;
DROP POLICY IF EXISTS "Advisors can insert activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_log;

-- Create proper SELECT policy: Users can only see their own activity OR activity on projects they own
CREATE POLICY "Users can view their own activity" 
ON public.activity_log 
FOR SELECT 
TO authenticated
USING (
  actor_id = auth.uid() 
  OR (project_id IS NOT NULL AND is_project_owned_by_user(project_id, auth.uid()))
);

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs" 
ON public.activity_log 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert activity logs for themselves
CREATE POLICY "Users can insert their own activity logs" 
ON public.activity_log 
FOR INSERT 
TO authenticated
WITH CHECK (
  actor_id = auth.uid() 
  AND actor_type IN ('advisor', 'entrepreneur', 'system')
);

-- Admins can manage all activity logs
CREATE POLICY "Admins can manage all activity logs" 
ON public.activity_log 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

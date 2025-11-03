-- Phase 5: Optimize storage RLS policies with helper function

-- Create helper function for storage access
CREATE OR REPLACE FUNCTION public.can_access_proposal_file(
  file_path text,
  user_uuid uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal_uuid uuid;
BEGIN
  -- Extract proposal ID from file path (format: proposal_id/filename)
  proposal_uuid := (string_to_array(file_path, '/'))[1]::uuid;
  
  -- Check if user is the advisor who submitted OR entrepreneur who owns project
  RETURN EXISTS (
    SELECT 1 FROM public.proposals p
    LEFT JOIN public.projects proj ON proj.id = p.project_id
    LEFT JOIN public.advisors adv ON adv.id = p.advisor_id
    WHERE p.id = proposal_uuid
    AND (adv.user_id = user_uuid OR proj.owner_id = user_uuid)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Replace complex RLS policies with optimized function calls
DROP POLICY IF EXISTS "Advisors upload proposal files" ON storage.objects;
DROP POLICY IF EXISTS "Advisors view proposal files" ON storage.objects;

CREATE POLICY "Users can upload proposal files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proposal-files'
  AND public.can_access_proposal_file(name, auth.uid())
);

CREATE POLICY "Users can view proposal files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'proposal-files'
  AND public.can_access_proposal_file(name, auth.uid())
);
-- Helper function to bypass RLS safely when checking project ownership
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND p.owner_id = auth.uid()
  );
$$;

-- Replace storage policies to use the helper function
DROP POLICY IF EXISTS "Project owners can read their project files" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can upload files to their project" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can update their project files" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can delete their project files" ON storage.objects;

CREATE POLICY "Project owners can read their project files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files'
  AND public.is_project_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Project owners can upload files to their project"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND public.is_project_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Project owners can update their project files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND public.is_project_owner(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'project-files'
  AND public.is_project_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Project owners can delete their project files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND public.is_project_owner(((storage.foldername(name))[1])::uuid)
);

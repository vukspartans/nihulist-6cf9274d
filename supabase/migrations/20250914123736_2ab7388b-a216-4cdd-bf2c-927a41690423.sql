-- Storage RLS policies for private bucket 'project-files'
-- Allow project owners to manage files under path: <projectId>/<filename>

-- SELECT policy: list/read metadata to generate signed URLs
CREATE POLICY "Project owners can read their project files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.owner_id = auth.uid()
  )
);

-- INSERT policy: upload
CREATE POLICY "Project owners can upload files to their project"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.owner_id = auth.uid()
  )
);

-- UPDATE policy: replace/rename
CREATE POLICY "Project owners can update their project files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.owner_id = auth.uid()
  )
);

-- DELETE policy: remove
CREATE POLICY "Project owners can delete their project files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.owner_id = auth.uid()
  )
);

-- RLS policies for project_files table (add missing UPDATE/DELETE)
CREATE POLICY "Users can update files of their projects"
ON public.project_files
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
      AND projects.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
      AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files of their projects"
ON public.project_files
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
      AND projects.owner_id = auth.uid()
  )
);

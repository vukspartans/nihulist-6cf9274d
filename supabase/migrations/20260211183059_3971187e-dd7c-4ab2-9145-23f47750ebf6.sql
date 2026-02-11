
-- ============================================
-- Task Comments table
-- ============================================
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT 'entrepreneur',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Helper: check if user has access to the task's project
CREATE OR REPLACE FUNCTION public.user_has_task_access(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_tasks pt
    JOIN projects p ON p.id = pt.project_id
    WHERE pt.id = _task_id
      AND (
        p.owner_id = _user_id
        OR EXISTS (
          SELECT 1 FROM project_advisors pa
          JOIN advisors a ON a.id = pa.advisor_id
          WHERE pa.project_id = p.id AND a.user_id = _user_id
        )
      )
  )
$$;

CREATE POLICY "Users can view task comments"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (public.user_has_task_access(auth.uid(), task_id));

CREATE POLICY "Users can add task comments"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND public.user_has_task_access(auth.uid(), task_id)
  );

CREATE POLICY "Authors can delete own comments"
  ON public.task_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- ============================================
-- Task Files table
-- ============================================
CREATE TABLE public.task_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_name text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task files"
  ON public.task_files FOR SELECT
  TO authenticated
  USING (public.user_has_task_access(auth.uid(), task_id));

CREATE POLICY "Users can upload task files"
  ON public.task_files FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND public.user_has_task_access(auth.uid(), task_id)
  );

CREATE POLICY "Uploaders can delete own files"
  ON public.task_files FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- ============================================
-- Storage bucket: task-files
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', false);

CREATE POLICY "Authenticated users can upload task files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-files');

CREATE POLICY "Authenticated users can read task files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-files');

CREATE POLICY "Users can delete own task files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-files');

-- Indexes
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_files_task_id ON public.task_files(task_id);

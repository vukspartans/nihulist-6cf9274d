
CREATE TABLE public.task_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.project_tasks(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  requested_changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.task_change_requests ENABLE ROW LEVEL SECURITY;

-- Advisors can create requests for tasks assigned to them
CREATE POLICY "advisor_insert_own" ON public.task_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Entrepreneurs can view/update requests for their projects
CREATE POLICY "entrepreneur_manage" ON public.task_change_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_tasks pt
      JOIN public.projects p ON p.id = pt.project_id
      WHERE pt.id = task_change_requests.task_id
      AND p.owner_id = auth.uid()
    )
  );

-- Advisors can view their own requests
CREATE POLICY "advisor_view_own" ON public.task_change_requests
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

CREATE INDEX idx_task_change_requests_task_id ON public.task_change_requests(task_id);
CREATE INDEX idx_task_change_requests_status ON public.task_change_requests(status);

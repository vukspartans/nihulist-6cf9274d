
-- Task Observers / CC
CREATE TABLE public.task_observers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES project_tasks(id) ON DELETE CASCADE NOT NULL,
  advisor_id uuid REFERENCES advisors(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, advisor_id)
);

ALTER TABLE public.task_observers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_owner_manage_observers" ON public.task_observers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_tasks pt
      JOIN projects p ON p.id = pt.project_id
      WHERE pt.id = task_observers.task_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "observer_view_own" ON public.task_observers
  FOR SELECT TO authenticated
  USING (
    advisor_id IN (
      SELECT id FROM advisors WHERE user_id = auth.uid()
    )
  );

-- User Task Preferences (personalization)
CREATE TABLE public.user_task_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL,
  task_name text NOT NULL,
  custom_name text,
  custom_description text,
  custom_duration_days integer,
  custom_advisor_specialty text,
  custom_notes text,
  project_type text NOT NULL,
  usage_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_task_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_preferences" ON public.user_task_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add hierarchy columns to task_templates
ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS parent_template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hierarchy_path text,
ADD COLUMN IF NOT EXISTS hierarchy_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS wbs_code text;

-- Add hierarchy columns to project_tasks
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES project_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hierarchy_path text,
ADD COLUMN IF NOT EXISTS hierarchy_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS wbs_code text;

-- Create index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_task_templates_hierarchy ON task_templates(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_task_templates_parent ON task_templates(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_hierarchy ON project_tasks(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_project_tasks_parent ON project_tasks(parent_task_id);

-- Create template_dependencies table for predecessor relationships
CREATE TABLE IF NOT EXISTS template_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  depends_on_template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'finish_to_start'
    CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, depends_on_template_id),
  CHECK (template_id != depends_on_template_id)
);

-- Enable RLS on template_dependencies
ALTER TABLE template_dependencies ENABLE ROW LEVEL SECURITY;

-- Admin policy for template_dependencies
CREATE POLICY "Admins can manage template dependencies"
ON template_dependencies FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
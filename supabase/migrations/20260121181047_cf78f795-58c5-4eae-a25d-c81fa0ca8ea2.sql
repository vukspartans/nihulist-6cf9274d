-- Add municipality_id to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_municipality_id ON public.projects(municipality_id);

-- Add lag_days to task_dependencies for dependency offsets
ALTER TABLE public.task_dependencies 
ADD COLUMN IF NOT EXISTS lag_days INTEGER DEFAULT 0;

-- Create project_licensing_stages table for stage-level tracking
CREATE TABLE IF NOT EXISTS public.project_licensing_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  licensing_phase_id UUID REFERENCES public.licensing_phases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for project_licensing_stages
CREATE INDEX IF NOT EXISTS idx_project_licensing_stages_project_id ON public.project_licensing_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_licensing_stages_phase_id ON public.project_licensing_stages(licensing_phase_id);

-- Enable RLS on project_licensing_stages
ALTER TABLE public.project_licensing_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_licensing_stages
CREATE POLICY "Project owners can manage their licensing stages"
ON public.project_licensing_stages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_licensing_stages.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Assigned advisors can view project stages"
ON public.project_licensing_stages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_advisors pa
    JOIN public.advisors a ON a.id = pa.advisor_id
    WHERE pa.project_id = project_licensing_stages.project_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all licensing stages"
ON public.project_licensing_stages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on project_licensing_stages
CREATE TRIGGER update_project_licensing_stages_updated_at
BEFORE UPDATE ON public.project_licensing_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-detect task delays
CREATE OR REPLACE FUNCTION public.check_task_delay()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-set status to delayed if planned_end_date has passed and task not completed/cancelled
  IF NEW.status NOT IN ('completed', 'cancelled') 
     AND NEW.planned_end_date IS NOT NULL 
     AND NEW.planned_end_date < CURRENT_DATE 
     AND OLD.status != 'delayed' THEN
    NEW.status := 'delayed';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply delay check trigger to project_tasks
DROP TRIGGER IF EXISTS check_project_task_delay ON public.project_tasks;
CREATE TRIGGER check_project_task_delay
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.check_task_delay();

-- Add stage_id to project_tasks to link tasks to stages
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.project_licensing_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_tasks_stage_id ON public.project_tasks(stage_id);
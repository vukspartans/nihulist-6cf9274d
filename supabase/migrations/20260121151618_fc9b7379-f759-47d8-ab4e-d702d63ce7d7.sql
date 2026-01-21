-- Create milestone_templates table
CREATE TABLE public.milestone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  project_type TEXT,
  municipality_id UUID REFERENCES public.municipalities(id),
  advisor_specialty TEXT,
  percentage_of_total NUMERIC(5,2) NOT NULL,
  fixed_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'ILS',
  trigger_type TEXT NOT NULL DEFAULT 'task_completion',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_percentage CHECK (percentage_of_total >= 0 AND percentage_of_total <= 100)
);

-- Create junction table for linking milestones to critical tasks
CREATE TABLE public.milestone_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_template_id UUID NOT NULL REFERENCES public.milestone_templates(id) ON DELETE CASCADE,
  task_template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  is_critical BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_milestone_task UNIQUE (milestone_template_id, task_template_id)
);

-- Enable RLS
ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_template_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestone_templates
CREATE POLICY "Admins can manage milestone templates" 
  ON public.milestone_templates FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active milestone templates" 
  ON public.milestone_templates FOR SELECT 
  USING ((auth.uid() IS NOT NULL) AND (is_active = true));

-- RLS Policies for milestone_template_tasks
CREATE POLICY "Admins can manage milestone template tasks" 
  ON public.milestone_template_tasks FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view milestone template tasks" 
  ON public.milestone_template_tasks FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Default system milestone templates
INSERT INTO public.milestone_templates 
  (name, name_en, percentage_of_total, trigger_type, is_system, display_order) 
VALUES
  ('חתימת חוזה', 'Contract Signing', 10.00, 'manual', true, 1),
  ('הגשת בקשה להיתר', 'Permit Application Submission', 20.00, 'task_completion', true, 2),
  ('קבלת היתר בניה', 'Building Permit Approval', 30.00, 'task_completion', true, 3),
  ('סיום פיקוח על הבניה', 'Construction Supervision Complete', 25.00, 'task_completion', true, 4),
  ('קבלת טופס 4', 'Form 4 Receipt', 15.00, 'task_completion', true, 5);
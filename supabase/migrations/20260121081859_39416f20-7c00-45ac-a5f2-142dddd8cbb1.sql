-- Create municipalities table for geographic scoping of templates
CREATE TABLE public.municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  region TEXT,
  has_special_requirements BOOLEAN DEFAULT false,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for municipalities
CREATE POLICY "Admins can manage municipalities"
ON public.municipalities FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active municipalities"
ON public.municipalities FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create licensing_phases table for configurable phases by municipality/project type
CREATE TABLE public.licensing_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  project_type TEXT,
  default_duration_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.licensing_phases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for licensing_phases
CREATE POLICY "Admins can manage licensing phases"
ON public.licensing_phases FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active phases"
ON public.licensing_phases FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Extend task_templates table with new columns for municipality support
ALTER TABLE public.task_templates 
ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS licensing_phase_id UUID REFERENCES public.licensing_phases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_user_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_group_id UUID,
ADD COLUMN IF NOT EXISTS depends_on_template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_templates_municipality ON public.task_templates(municipality_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_phase ON public.task_templates(licensing_phase_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_group ON public.task_templates(template_group_id);
CREATE INDEX IF NOT EXISTS idx_licensing_phases_municipality ON public.licensing_phases(municipality_id);

-- Create updated_at trigger for municipalities
CREATE TRIGGER update_municipalities_updated_at
BEFORE UPDATE ON public.municipalities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for licensing_phases
CREATE TRIGGER update_licensing_phases_updated_at
BEFORE UPDATE ON public.licensing_phases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
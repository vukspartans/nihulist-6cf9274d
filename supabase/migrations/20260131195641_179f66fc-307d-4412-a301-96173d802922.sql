-- Add category_id linkage to service scope templates
ALTER TABLE public.default_service_scope_templates
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fee_template_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_type TEXT;

-- Add category_id linkage to milestone templates  
ALTER TABLE public.milestone_templates
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fee_template_categories(id) ON DELETE SET NULL;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_service_scope_category ON public.default_service_scope_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_milestone_template_category ON public.milestone_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_service_scope_project_type ON public.default_service_scope_templates(project_type);
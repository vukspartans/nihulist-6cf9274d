-- =============================================
-- Phase 1: Hierarchical Fee Templates Schema
-- =============================================

-- 1. Create fee_template_categories table (Level 3)
CREATE TABLE public.fee_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  advisor_specialty TEXT NOT NULL,
  project_type TEXT,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create fee_submission_methods table (Level 4)
CREATE TABLE public.fee_submission_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.fee_template_categories(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('lump_sum', 'quantity', 'hourly')),
  method_label TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Alter default_fee_item_templates to support hierarchy
ALTER TABLE public.default_fee_item_templates
  ADD COLUMN IF NOT EXISTS submission_method_id UUID REFERENCES public.fee_submission_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fee_template_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_user_template BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Create indexes for performance
CREATE INDEX idx_fee_template_categories_advisor ON public.fee_template_categories(advisor_specialty);
CREATE INDEX idx_fee_template_categories_project ON public.fee_template_categories(project_type);
CREATE INDEX idx_fee_submission_methods_category ON public.fee_submission_methods(category_id);
CREATE INDEX idx_fee_item_templates_hierarchy ON public.default_fee_item_templates(category_id, submission_method_id);
CREATE INDEX idx_fee_item_templates_user ON public.default_fee_item_templates(created_by_user_id) WHERE is_user_template = true;

-- 5. Enable RLS on new tables
ALTER TABLE public.fee_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_submission_methods ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for fee_template_categories
CREATE POLICY "Anyone can view active categories"
  ON public.fee_template_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.fee_template_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 7. RLS Policies for fee_submission_methods
CREATE POLICY "Anyone can view active submission methods"
  ON public.fee_submission_methods FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage submission methods"
  ON public.fee_submission_methods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 8. Update RLS for default_fee_item_templates to support user templates
CREATE POLICY "Users can view their own templates"
  ON public.default_fee_item_templates FOR SELECT
  USING (
    is_user_template = false 
    OR created_by_user_id = auth.uid()
  );

CREATE POLICY "Users can create their own templates"
  ON public.default_fee_item_templates FOR INSERT
  WITH CHECK (
    is_user_template = true 
    AND created_by_user_id = auth.uid()
  );

CREATE POLICY "Users can update their own templates"
  ON public.default_fee_item_templates FOR UPDATE
  USING (
    is_user_template = true 
    AND created_by_user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own templates"
  ON public.default_fee_item_templates FOR DELETE
  USING (
    is_user_template = true 
    AND created_by_user_id = auth.uid()
  );

-- 9. Trigger for updated_at on fee_template_categories
CREATE TRIGGER update_fee_template_categories_updated_at
  BEFORE UPDATE ON public.fee_template_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
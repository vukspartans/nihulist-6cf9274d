-- Create payment_categories table
CREATE TABLE public.payment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#6B7280',
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT payment_categories_name_unique UNIQUE (name)
);

-- Enable RLS
ALTER TABLE public.payment_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage payment categories" ON public.payment_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active categories" ON public.payment_categories
  FOR SELECT USING ((auth.uid() IS NOT NULL) AND (is_active = true));

-- Trigger for updated_at
CREATE TRIGGER update_payment_categories_updated_at
  BEFORE UPDATE ON public.payment_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system categories
INSERT INTO public.payment_categories (name, name_en, is_system, display_order, color) VALUES
  ('מתכננים', 'planners', true, 1, '#3B82F6'),
  ('שיווק ופרסום', 'marketing', true, 2, '#10B981'),
  ('אגרות והיטלים', 'fees_levies', true, 3, '#F59E0B'),
  ('שונות', 'miscellaneous', true, 4, '#6B7280');
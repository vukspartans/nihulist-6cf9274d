-- Create default fee item templates table
CREATE TABLE public.default_fee_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_specialty TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'lump_sum',
  default_quantity NUMERIC DEFAULT 1,
  charge_type TEXT DEFAULT 'one_time',
  is_optional BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_fee_item_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read templates
CREATE POLICY "Anyone can read fee templates"
  ON public.default_fee_item_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Only admins can manage templates  
CREATE POLICY "Admins can manage fee templates"
  ON public.default_fee_item_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster lookups by specialty
CREATE INDEX idx_fee_templates_specialty ON public.default_fee_item_templates(advisor_specialty);

-- Seed initial templates for common advisor types
INSERT INTO public.default_fee_item_templates (advisor_specialty, description, unit, default_quantity, charge_type, is_optional, display_order) VALUES
  -- יועץ תנועה
  ('יועץ תנועה', 'חוו"ד תחבורתית ראשונית', 'lump_sum', 1, 'one_time', false, 1),
  ('יועץ תנועה', 'הכנת נספח תנועה', 'lump_sum', 1, 'one_time', false, 2),
  ('יועץ תנועה', 'ליווי מול רשויות', 'hourly', 10, 'hourly', false, 3),
  ('יועץ תנועה', 'ייצוג בוועדות', 'per_visit', 3, 'per_visit', true, 4),
  
  -- שמאי מקרקעין
  ('שמאי מקרקעין', 'שומת מקרקעין', 'lump_sum', 1, 'one_time', false, 1),
  ('שמאי מקרקעין', 'חוו"ד להיטל השבחה', 'lump_sum', 1, 'one_time', false, 2),
  ('שמאי מקרקעין', 'ייצוג בוועדת ערר', 'per_visit', 2, 'per_visit', true, 3),
  
  -- אדריכל
  ('אדריכל', 'תכנון ראשוני', 'sqm', 1, 'one_time', false, 1),
  ('אדריכל', 'תכנון מפורט', 'sqm', 1, 'one_time', false, 2),
  ('אדריכל', 'פיקוח עליון', 'monthly', 12, 'monthly', false, 3),
  ('אדריכל', 'ליווי הליכי רישוי', 'lump_sum', 1, 'one_time', true, 4),
  
  -- מהנדס קונסטרוקציה
  ('מהנדס קונסטרוקציה', 'תכנון שלד', 'sqm', 1, 'one_time', false, 1),
  ('מהנדס קונסטרוקציה', 'פיקוח קונסטרוקטיבי', 'per_visit', 10, 'per_visit', false, 2),
  ('מהנדס קונסטרוקציה', 'בדיקת יציבות מבנה קיים', 'lump_sum', 1, 'one_time', true, 3),
  
  -- יועץ חשמל
  ('יועץ חשמל', 'תכנון מערכות חשמל', 'sqm', 1, 'one_time', false, 1),
  ('יועץ חשמל', 'תיאום מול חברת החשמל', 'lump_sum', 1, 'one_time', false, 2),
  ('יועץ חשמל', 'פיקוח על ביצוע', 'per_visit', 5, 'per_visit', true, 3),
  
  -- יועץ אינסטלציה
  ('יועץ אינסטלציה', 'תכנון מערכות אינסטלציה', 'sqm', 1, 'one_time', false, 1),
  ('יועץ אינסטלציה', 'תכנון ניקוז', 'lump_sum', 1, 'one_time', false, 2),
  ('יועץ אינסטלציה', 'פיקוח על ביצוע', 'per_visit', 5, 'per_visit', true, 3);
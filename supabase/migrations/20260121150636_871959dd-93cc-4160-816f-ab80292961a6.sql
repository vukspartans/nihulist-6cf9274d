-- Create payment_status_definitions table
CREATE TABLE public.payment_status_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  notify_on_enter BOOLEAN NOT NULL DEFAULT true,
  notify_roles TEXT[] DEFAULT '{}',
  email_template_key TEXT,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  signature_type TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_status_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage payment status definitions" 
  ON public.payment_status_definitions FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated users can view active statuses" 
  ON public.payment_status_definitions FOR SELECT 
  USING ((auth.uid() IS NOT NULL) AND (is_active = true));

-- Updated_at trigger
CREATE TRIGGER update_payment_status_definitions_updated_at
  BEFORE UPDATE ON public.payment_status_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Default system statuses
INSERT INTO public.payment_status_definitions 
  (code, name, name_en, display_order, is_system, is_terminal, color, notify_on_enter, requires_signature, signature_type) 
VALUES
  ('prepared', 'טיוטה', 'Draft', 1, true, false, '#6B7280', false, false, 'none'),
  ('submitted', 'הוגש', 'Submitted', 2, true, false, '#3B82F6', true, false, 'none'),
  ('professionally_approved', 'אושר מקצועית', 'Professionally Approved', 3, true, false, '#8B5CF6', true, true, 'checkbox'),
  ('budget_approved', 'אושר תקציבית', 'Budget Approved', 4, true, false, '#10B981', true, true, 'drawn'),
  ('awaiting_payment', 'ממתין לתשלום', 'Awaiting Payment', 5, true, false, '#F59E0B', true, false, 'none'),
  ('paid', 'שולם', 'Paid', 6, true, true, '#22C55E', true, false, 'none'),
  ('rejected', 'נדחה', 'Rejected', 7, true, true, '#EF4444', true, false, 'none');

-- Create organization_approval_chains table for future use
CREATE TABLE public.organization_approval_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  after_status_code TEXT NOT NULL REFERENCES public.payment_status_definitions(code),
  approver_role TEXT,
  approver_user_id UUID,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_on_enter BOOLEAN NOT NULL DEFAULT true,
  notify_email TEXT,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  signature_type TEXT DEFAULT 'checkbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_approval_chains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_approval_chains
CREATE POLICY "Organization members can view their chains"
  ON public.organization_approval_chains FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all approval chains"
  ON public.organization_approval_chains FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Updated_at trigger
CREATE TRIGGER update_organization_approval_chains_updated_at
  BEFORE UPDATE ON public.organization_approval_chains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
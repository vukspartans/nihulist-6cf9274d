-- Create table for RFP fee items (entrepreneur's requested fee structure)
CREATE TABLE public.rfp_request_fee_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_invite_id UUID REFERENCES public.rfp_invites(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'lump_sum',
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC,
  charge_type TEXT DEFAULT 'one_time',
  is_optional BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for service scope items (checklist items)
CREATE TABLE public.rfp_service_scope_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_invite_id UUID REFERENCES public.rfp_invites(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  is_included BOOLEAN DEFAULT true,
  fee_category TEXT DEFAULT 'general',
  is_optional BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for admin-configurable default service scope templates
CREATE TABLE public.default_service_scope_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_specialty TEXT NOT NULL,
  task_name TEXT NOT NULL,
  default_fee_category TEXT DEFAULT 'general',
  is_optional BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_rfp_fee_items_invite ON public.rfp_request_fee_items(rfp_invite_id);
CREATE INDEX idx_service_scope_items_invite ON public.rfp_service_scope_items(rfp_invite_id);
CREATE INDEX idx_default_templates_specialty ON public.default_service_scope_templates(advisor_specialty);

-- Enable RLS
ALTER TABLE public.rfp_request_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_service_scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_service_scope_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rfp_request_fee_items
CREATE POLICY "Entrepreneurs can manage fee items for their RFP invites"
ON public.rfp_request_fee_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.rfp_invites ri
    JOIN public.rfps r ON r.id = ri.rfp_id
    JOIN public.projects p ON p.id = r.project_id
    WHERE ri.id = rfp_request_fee_items.rfp_invite_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Advisors can view fee items for their invites"
ON public.rfp_request_fee_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rfp_invites ri
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE ri.id = rfp_request_fee_items.rfp_invite_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all fee items"
ON public.rfp_request_fee_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for rfp_service_scope_items
CREATE POLICY "Entrepreneurs can manage scope items for their RFP invites"
ON public.rfp_service_scope_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.rfp_invites ri
    JOIN public.rfps r ON r.id = ri.rfp_id
    JOIN public.projects p ON p.id = r.project_id
    WHERE ri.id = rfp_service_scope_items.rfp_invite_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Advisors can view scope items for their invites"
ON public.rfp_service_scope_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rfp_invites ri
    JOIN public.advisors a ON a.id = ri.advisor_id
    WHERE ri.id = rfp_service_scope_items.rfp_invite_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all scope items"
ON public.rfp_service_scope_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for default_service_scope_templates (admin only write, all authenticated read)
CREATE POLICY "Anyone authenticated can view default templates"
ON public.default_service_scope_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage default templates"
ON public.default_service_scope_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for rfp_request_fee_items
CREATE TRIGGER update_rfp_request_fee_items_updated_at
BEFORE UPDATE ON public.rfp_request_fee_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for default_service_scope_templates
CREATE TRIGGER update_default_service_scope_templates_updated_at
BEFORE UPDATE ON public.default_service_scope_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
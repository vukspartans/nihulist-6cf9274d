-- Create table for RFP request drafts
CREATE TABLE public.rfp_request_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  advisor_type TEXT NOT NULL,
  
  -- Main request data
  request_title TEXT,
  request_content TEXT,
  request_attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Service details
  service_details_mode TEXT DEFAULT 'free_text',
  service_details_free_text TEXT,
  service_details_file JSONB,
  service_scope_items JSONB DEFAULT '[]'::jsonb,
  
  -- Fee items
  fee_items JSONB DEFAULT '[]'::jsonb,
  optional_fee_items JSONB DEFAULT '[]'::jsonb,
  
  -- Payment terms
  payment_terms JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  has_been_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one draft per project + advisor type + user
  UNIQUE(project_id, advisor_type, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.rfp_request_drafts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own drafts
CREATE POLICY "Users can manage their drafts"
  ON public.rfp_request_drafts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all drafts
CREATE POLICY "Admins can manage all drafts"
  ON public.rfp_request_drafts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_rfp_request_drafts_updated_at
  BEFORE UPDATE ON public.rfp_request_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_rfp_request_drafts_project_user 
  ON public.rfp_request_drafts(project_id, user_id);
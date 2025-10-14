-- Create project_advisors table to track selected/hired advisors
CREATE TABLE public.project_advisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES public.advisors(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  
  -- Financial details
  fee_amount numeric NOT NULL,
  fee_currency text DEFAULT 'ILS',
  fee_type text NOT NULL, -- 'fixed', 'percentage', 'hourly', 'milestone'
  payment_terms text,
  
  -- Agreement details
  agreement_url text,
  start_date date,
  end_date date,
  scope_of_work text,
  deliverables text[],
  
  -- Status tracking
  status text DEFAULT 'active', -- 'active', 'completed', 'terminated'
  selected_at timestamp with time zone DEFAULT now(),
  selected_by uuid REFERENCES auth.users(id),
  
  -- Metadata
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(project_id, advisor_id)
);

-- Enable RLS
ALTER TABLE public.project_advisors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Entrepreneurs can view their project advisors"
ON public.project_advisors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_advisors.project_id 
    AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Entrepreneurs can add advisors to their projects"
ON public.project_advisors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_advisors.project_id 
    AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Entrepreneurs can update their project advisors"
ON public.project_advisors FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_advisors.project_id 
    AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Advisors can view their own selections"
ON public.project_advisors FOR SELECT
USING (
  advisor_id IN (
    SELECT id FROM public.advisors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all project advisors"
ON public.project_advisors FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_project_advisors_updated_at
  BEFORE UPDATE ON public.project_advisors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for advisor agreements
INSERT INTO storage.buckets (id, name, public)
VALUES ('advisor-agreements', 'advisor-agreements', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for advisor agreements
CREATE POLICY "Users can view their project agreements"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'advisor-agreements' AND
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can upload agreements for their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'advisor-agreements' AND
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all agreements"
ON storage.objects FOR ALL
USING (
  bucket_id = 'advisor-agreements' AND
  has_role(auth.uid(), 'admin'::app_role)
);
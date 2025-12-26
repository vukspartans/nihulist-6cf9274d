-- =====================================================
-- PHASE A: Task Management & Accounts Payable Database Foundation
-- =====================================================

-- =====================================================
-- PART 1: TASK MANAGEMENT TABLES
-- =====================================================

-- Task Templates (predefined by project type)
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_duration_days INTEGER DEFAULT 7,
  display_order INTEGER DEFAULT 0,
  phase TEXT,
  advisor_specialty TEXT,
  is_milestone BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Tasks (generated from templates or created manually)
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  phase TEXT,
  assigned_advisor_id UUID REFERENCES public.advisors(id) ON DELETE SET NULL,
  assigned_user_id UUID,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  duration_days INTEGER,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  is_milestone BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_task_status CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'cancelled'))
);

-- Task Dependencies
CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  CONSTRAINT valid_dependency_type CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'))
);

-- =====================================================
-- PART 2: ACCOUNTS PAYABLE TABLES
-- =====================================================

-- Payment Milestones (linked to tasks and advisors)
CREATE TABLE public.payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_advisor_id UUID REFERENCES public.project_advisors(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  percentage_of_total NUMERIC CHECK (percentage_of_total >= 0 AND percentage_of_total <= 100),
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  display_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_milestone_trigger CHECK (trigger_type IN ('task_completion', 'manual', 'date_based')),
  CONSTRAINT valid_milestone_status CHECK (status IN ('pending', 'eligible', 'invoiced', 'paid'))
);

-- Payment Requests (invoices from consultants/external parties)
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_advisor_id UUID REFERENCES public.project_advisors(id) ON DELETE SET NULL,
  payment_milestone_id UUID REFERENCES public.payment_milestones(id) ON DELETE SET NULL,
  
  -- Request identification
  request_number TEXT UNIQUE,
  category TEXT NOT NULL DEFAULT 'consultant',
  source_type TEXT NOT NULL DEFAULT 'consultant_milestone',
  
  -- Financial details
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  vat_percent NUMERIC DEFAULT 17,
  vat_amount NUMERIC,
  total_amount NUMERIC,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'prepared',
  
  -- Submission tracking
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  
  -- Approval workflow
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  approver_signature_id UUID REFERENCES public.signatures(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,
  
  -- Payment tracking
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  
  -- External party info
  external_party_name TEXT,
  external_party_id TEXT,
  
  -- Files and attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  invoice_file_url TEXT,
  
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_request_category CHECK (category IN ('consultant', 'external', 'materials', 'permits', 'other')),
  CONSTRAINT valid_request_source CHECK (source_type IN ('consultant_milestone', 'external', 'manual')),
  CONSTRAINT valid_request_status CHECK (status IN ('prepared', 'submitted', 'in_accounting', 'awaiting_payment', 'paid', 'rejected'))
);

-- =====================================================
-- PART 3: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_task_templates_project_type ON public.task_templates(project_type);
CREATE INDEX idx_task_templates_phase ON public.task_templates(phase);

CREATE INDEX idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX idx_project_tasks_status ON public.project_tasks(status);
CREATE INDEX idx_project_tasks_assigned_advisor ON public.project_tasks(assigned_advisor_id);
CREATE INDEX idx_project_tasks_phase ON public.project_tasks(phase);

CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

CREATE INDEX idx_payment_milestones_project_id ON public.payment_milestones(project_id);
CREATE INDEX idx_payment_milestones_task_id ON public.payment_milestones(task_id);
CREATE INDEX idx_payment_milestones_status ON public.payment_milestones(status);

CREATE INDEX idx_payment_requests_project_id ON public.payment_requests(project_id);
CREATE INDEX idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX idx_payment_requests_milestone_id ON public.payment_requests(payment_milestone_id);

-- =====================================================
-- PART 4: UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_milestones_updated_at
  BEFORE UPDATE ON public.payment_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 5: HELPER FUNCTIONS
-- =====================================================

-- Function to check if user owns the project a task belongs to
CREATE OR REPLACE FUNCTION public.is_task_project_owner(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_tasks pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = _task_id AND p.owner_id = _user_id
  );
$$;

-- Function to check if advisor is assigned to task
CREATE OR REPLACE FUNCTION public.is_advisor_assigned_to_task(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_tasks pt
    JOIN public.advisors a ON a.id = pt.assigned_advisor_id
    WHERE pt.id = _task_id AND a.user_id = _user_id
  );
$$;

-- Function to generate payment request number
CREATE OR REPLACE FUNCTION public.generate_payment_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(request_number FROM 'PR-' || year_str || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.payment_requests
  WHERE request_number LIKE 'PR-' || year_str || '-%';
  
  NEW.request_number := 'PR-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_payment_request_number_trigger
  BEFORE INSERT ON public.payment_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION public.generate_payment_request_number();

-- Function to calculate VAT and total amounts
CREATE OR REPLACE FUNCTION public.calculate_payment_request_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.vat_percent IS NOT NULL AND NEW.amount IS NOT NULL THEN
    NEW.vat_amount := ROUND(NEW.amount * NEW.vat_percent / 100, 2);
    NEW.total_amount := NEW.amount + NEW.vat_amount;
  ELSE
    NEW.total_amount := NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_payment_request_totals_trigger
  BEFORE INSERT OR UPDATE OF amount, vat_percent ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_payment_request_totals();

-- =====================================================
-- PART 6: ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TASK TEMPLATES POLICIES
-- =====================================================

-- Anyone authenticated can view active templates
CREATE POLICY "Anyone authenticated can view active task templates"
ON public.task_templates FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admins can manage all templates
CREATE POLICY "Admins can manage task templates"
ON public.task_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PROJECT TASKS POLICIES
-- =====================================================

-- Entrepreneurs can manage tasks for their projects
CREATE POLICY "Entrepreneurs can view their project tasks"
ON public.project_tasks FOR SELECT
USING (public.is_project_owned_by_user(project_id, auth.uid()));

CREATE POLICY "Entrepreneurs can create tasks for their projects"
ON public.project_tasks FOR INSERT
WITH CHECK (public.is_project_owned_by_user(project_id, auth.uid()));

CREATE POLICY "Entrepreneurs can update their project tasks"
ON public.project_tasks FOR UPDATE
USING (public.is_project_owned_by_user(project_id, auth.uid()));

CREATE POLICY "Entrepreneurs can delete their project tasks"
ON public.project_tasks FOR DELETE
USING (public.is_project_owned_by_user(project_id, auth.uid()));

-- Advisors can view tasks assigned to them
CREATE POLICY "Advisors can view tasks assigned to them"
ON public.project_tasks FOR SELECT
USING (
  assigned_advisor_id IN (
    SELECT id FROM public.advisors WHERE user_id = auth.uid()
  )
);

-- Advisors can update tasks assigned to them (progress, status, notes)
CREATE POLICY "Advisors can update their assigned tasks"
ON public.project_tasks FOR UPDATE
USING (
  assigned_advisor_id IN (
    SELECT id FROM public.advisors WHERE user_id = auth.uid()
  )
);

-- Admins can manage all tasks
CREATE POLICY "Admins can manage all project tasks"
ON public.project_tasks FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TASK DEPENDENCIES POLICIES
-- =====================================================

-- Users can view dependencies for tasks they can see
CREATE POLICY "Users can view task dependencies for their projects"
ON public.task_dependencies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_tasks pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = task_dependencies.task_id
    AND p.owner_id = auth.uid()
  )
);

-- Entrepreneurs can manage dependencies for their project tasks
CREATE POLICY "Entrepreneurs can create task dependencies"
ON public.task_dependencies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_tasks pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = task_dependencies.task_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Entrepreneurs can delete task dependencies"
ON public.task_dependencies FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_tasks pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = task_dependencies.task_id
    AND p.owner_id = auth.uid()
  )
);

-- Advisors can view dependencies for assigned tasks
CREATE POLICY "Advisors can view dependencies for assigned tasks"
ON public.task_dependencies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_tasks pt
    JOIN public.advisors a ON a.id = pt.assigned_advisor_id
    WHERE pt.id = task_dependencies.task_id
    AND a.user_id = auth.uid()
  )
);

-- Admins can manage all dependencies
CREATE POLICY "Admins can manage all task dependencies"
ON public.task_dependencies FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PAYMENT MILESTONES POLICIES
-- =====================================================

-- Entrepreneurs can manage milestones for their projects
CREATE POLICY "Entrepreneurs can view their project milestones"
ON public.payment_milestones FOR SELECT
USING (public.is_project_owned_by_user(project_id, auth.uid()));

CREATE POLICY "Entrepreneurs can create milestones for their projects"
ON public.payment_milestones FOR INSERT
WITH CHECK (public.is_project_owned_by_user(project_id, auth.uid()));

CREATE POLICY "Entrepreneurs can update their project milestones"
ON public.payment_milestones FOR UPDATE
USING (public.is_project_owned_by_user(project_id, auth.uid()));

CREATE POLICY "Entrepreneurs can delete their project milestones"
ON public.payment_milestones FOR DELETE
USING (public.is_project_owned_by_user(project_id, auth.uid()));

-- Advisors can view milestones linked to them
CREATE POLICY "Advisors can view their payment milestones"
ON public.payment_milestones FOR SELECT
USING (
  project_advisor_id IN (
    SELECT pa.id FROM public.project_advisors pa
    JOIN public.advisors a ON a.id = pa.advisor_id
    WHERE a.user_id = auth.uid()
  )
);

-- Admins can manage all milestones
CREATE POLICY "Admins can manage all payment milestones"
ON public.payment_milestones FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PAYMENT REQUESTS POLICIES
-- =====================================================

-- Entrepreneurs can view and manage payment requests for their projects
CREATE POLICY "Entrepreneurs can view their project payment requests"
ON public.payment_requests FOR SELECT
USING (public.is_project_owned_by_user(project_id, auth.uid()));

CREATE POLICY "Entrepreneurs can create payment requests for their projects"
ON public.payment_requests FOR INSERT
WITH CHECK (public.is_project_owned_by_user(project_id, auth.uid()));

CREATE POLICY "Entrepreneurs can update their project payment requests"
ON public.payment_requests FOR UPDATE
USING (public.is_project_owned_by_user(project_id, auth.uid()));

-- Advisors can create payment requests for their project assignments
CREATE POLICY "Advisors can create their payment requests"
ON public.payment_requests FOR INSERT
WITH CHECK (
  project_advisor_id IN (
    SELECT pa.id FROM public.project_advisors pa
    JOIN public.advisors a ON a.id = pa.advisor_id
    WHERE a.user_id = auth.uid()
  )
);

-- Advisors can view their own payment requests
CREATE POLICY "Advisors can view their payment requests"
ON public.payment_requests FOR SELECT
USING (
  project_advisor_id IN (
    SELECT pa.id FROM public.project_advisors pa
    JOIN public.advisors a ON a.id = pa.advisor_id
    WHERE a.user_id = auth.uid()
  )
);

-- Advisors can update their own pending payment requests
CREATE POLICY "Advisors can update their pending payment requests"
ON public.payment_requests FOR UPDATE
USING (
  project_advisor_id IN (
    SELECT pa.id FROM public.project_advisors pa
    JOIN public.advisors a ON a.id = pa.advisor_id
    WHERE a.user_id = auth.uid()
  )
  AND status IN ('prepared', 'submitted')
);

-- Admins can manage all payment requests
CREATE POLICY "Admins can manage all payment requests"
ON public.payment_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
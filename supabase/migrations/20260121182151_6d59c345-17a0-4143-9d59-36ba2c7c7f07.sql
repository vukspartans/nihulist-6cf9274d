-- Add payment_milestone_id and is_payment_critical to project_tasks
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS payment_milestone_id UUID 
REFERENCES public.payment_milestones(id) ON DELETE SET NULL;

ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS is_payment_critical BOOLEAN DEFAULT false;

-- Create index for faster milestone-task lookups
CREATE INDEX IF NOT EXISTS idx_project_tasks_payment_milestone 
ON public.project_tasks(payment_milestone_id) WHERE payment_milestone_id IS NOT NULL;

-- Add approver_signature_id to payment_requests if not exists (for signature tracking)
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS approver_signature_id UUID 
REFERENCES public.signatures(id) ON DELETE SET NULL;

-- Create index for signature lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_signature 
ON public.payment_requests(approver_signature_id) WHERE approver_signature_id IS NOT NULL;
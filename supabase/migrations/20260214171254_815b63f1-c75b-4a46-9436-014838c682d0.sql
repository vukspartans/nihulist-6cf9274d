
ALTER TABLE public.payment_milestones DROP CONSTRAINT IF EXISTS valid_milestone_status;
ALTER TABLE public.payment_milestones ADD CONSTRAINT valid_milestone_status CHECK (status IN ('pending', 'due', 'eligible', 'invoiced', 'paid', 'overdue'));

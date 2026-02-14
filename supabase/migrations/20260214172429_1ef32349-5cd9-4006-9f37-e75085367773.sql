
-- Fix: allow approval-chain statuses in payment_requests
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS valid_request_status;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT valid_request_status
  CHECK (status IN ('prepared', 'submitted', 'in_accounting', 'professionally_approved', 'budget_approved', 'awaiting_payment', 'paid', 'rejected'));

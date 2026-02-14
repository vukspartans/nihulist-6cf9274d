ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS expected_payment_date date;
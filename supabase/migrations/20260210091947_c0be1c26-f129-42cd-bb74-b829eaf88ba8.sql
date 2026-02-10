ALTER TABLE public.payment_requests
  ADD COLUMN index_type text,
  ADD COLUMN index_base_value numeric,
  ADD COLUMN index_current_value numeric,
  ADD COLUMN index_adjustment_factor numeric,
  ADD COLUMN index_adjusted_amount numeric;
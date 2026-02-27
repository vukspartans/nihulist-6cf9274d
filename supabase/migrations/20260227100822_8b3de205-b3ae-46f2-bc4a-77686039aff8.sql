
-- Add urgency column with check constraint
ALTER TABLE public.payment_requests 
ADD COLUMN urgency text NOT NULL DEFAULT 'normal' 
CHECK (urgency IN ('normal', 'medium', 'urgent', 'immediate'));

-- Add accountant_notes column
ALTER TABLE public.payment_requests 
ADD COLUMN accountant_notes text;

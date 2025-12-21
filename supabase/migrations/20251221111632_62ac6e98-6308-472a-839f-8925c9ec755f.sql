-- Add phone and status columns to user_feedback table
ALTER TABLE public.user_feedback 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add check constraint for valid status values
ALTER TABLE public.user_feedback 
ADD CONSTRAINT user_feedback_status_check 
CHECK (status IN ('pending', 'handled'));
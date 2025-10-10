-- Add office phone and position fields to advisors table
ALTER TABLE public.advisors 
ADD COLUMN office_phone text,
ADD COLUMN position_in_office text;

-- Remove hourly_rate column as it's no longer needed
ALTER TABLE public.advisors 
DROP COLUMN IF EXISTS hourly_rate;
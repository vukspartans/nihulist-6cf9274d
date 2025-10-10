-- Change years_experience to founding_year in advisors table
ALTER TABLE public.advisors 
RENAME COLUMN years_experience TO founding_year;

-- Update column comment for clarity
COMMENT ON COLUMN public.advisors.founding_year IS 'Year the office was established (e.g., 2015)';
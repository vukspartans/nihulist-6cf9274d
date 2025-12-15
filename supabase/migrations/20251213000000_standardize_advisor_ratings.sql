-- ============================================================================
-- STANDARDIZE ADVISOR RATINGS TO 0-5 SCALE
-- ============================================================================
-- This migration standardizes all advisor ratings to 0-5 scale (industry standard)
-- 
-- Conversion logic:
-- - If rating > 10: Assume 0-100 scale, divide by 20 (75.0 → 3.75, 85.0 → 4.25)
-- - If rating <= 5: Already in 0-5 scale, keep as is
-- - If rating between 5-10: Assume 0-10 scale, divide by 2 (7.5 → 3.75)
-- 
-- Industry Standard: 0-5 scale (like Amazon, Google Reviews, Airbnb)
-- ============================================================================

-- IMPORTANT: First drop existing constraint if it exists
ALTER TABLE public.advisors 
  DROP CONSTRAINT IF EXISTS advisors_rating_check;

-- IMPORTANT: Convert existing data BEFORE adding new constraint
-- Standardize all existing ratings to 0-5 scale
UPDATE public.advisors
SET rating = CASE
  -- If rating > 10, assume 0-100 scale, convert to 0-5
  WHEN rating > 10 THEN rating / 20.0
  -- If rating between 5-10, assume 0-10 scale, convert to 0-5
  WHEN rating > 5 AND rating <= 10 THEN rating / 2.0
  -- If rating <= 5, already in correct scale, keep as is
  WHEN rating <= 5 AND rating >= 0 THEN rating
  -- If negative or invalid, set to NULL
  ELSE NULL
END
WHERE rating IS NOT NULL;

-- Now add constraint to ensure future ratings are 0-5
ALTER TABLE public.advisors
  ADD CONSTRAINT advisors_rating_check 
  CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

-- Add comment to document the scale
COMMENT ON COLUMN public.advisors.rating IS 
  'Advisor historical rating on 0-5 scale. This is the overall rating of the advisor based on past projects, feedback, and performance. Used in AI evaluation as one of the scoring factors (20% weight).';

-- Verify the conversion
DO $$
DECLARE
  v_max_rating NUMERIC;
  v_min_rating NUMERIC;
  v_count_above_5 INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT MAX(rating), MIN(rating), COUNT(*) 
  INTO v_max_rating, v_min_rating, v_total_count
  FROM public.advisors
  WHERE rating IS NOT NULL;
  
  -- Check if any ratings are still above 5
  SELECT COUNT(*) 
  INTO v_count_above_5
  FROM public.advisors
  WHERE rating IS NOT NULL AND rating > 5;
  
  IF v_count_above_5 > 0 THEN
    RAISE WARNING 'Found % advisors with rating > 5 after conversion. Max: %, Min: %. Please review and fix manually.', 
      v_count_above_5, v_max_rating, v_min_rating;
  ELSE
    RAISE NOTICE 'Rating standardization complete. All % ratings are now in 0-5 scale.', v_total_count;
    RAISE NOTICE 'Max rating: %, Min rating: %', v_max_rating, v_min_rating;
  END IF;
END $$;


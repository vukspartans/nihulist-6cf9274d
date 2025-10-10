-- Add "no cover" as default option (0 = no cover)
-- Update all existing advisors to have no cover by default instead of option 1
UPDATE public.advisors 
SET cover_image_url = '0' 
WHERE cover_image_url = '1' OR cover_image_url IS NULL;
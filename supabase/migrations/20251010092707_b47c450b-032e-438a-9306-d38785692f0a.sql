-- Change cover_image_url to store cover selection (1, 2, or 3) instead of URL
-- First, update existing data to use option 1 as default
UPDATE public.advisors 
SET cover_image_url = '1' 
WHERE cover_image_url IS NULL OR cover_image_url = '';

-- For advisors with existing custom uploads, set to option 1
UPDATE public.advisors 
SET cover_image_url = '1' 
WHERE cover_image_url LIKE 'http%';
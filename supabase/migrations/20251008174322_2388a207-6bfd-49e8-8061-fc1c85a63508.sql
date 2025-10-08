-- Add social media and website URL columns to advisors table
ALTER TABLE advisors 
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS instagram_url text;
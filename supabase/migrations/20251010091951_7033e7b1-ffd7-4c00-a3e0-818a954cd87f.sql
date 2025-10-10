-- Create storage bucket for advisor assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('advisor-assets', 'advisor-assets', true);

-- Add logo_url and cover_image_url columns to advisors table
ALTER TABLE public.advisors 
ADD COLUMN logo_url text,
ADD COLUMN cover_image_url text;

-- Create RLS policies for advisor-assets bucket
CREATE POLICY "Advisors can upload their own assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'advisor-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Advisors can update their own assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'advisor-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Advisors can delete their own assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'advisor-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Advisor assets are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'advisor-assets');
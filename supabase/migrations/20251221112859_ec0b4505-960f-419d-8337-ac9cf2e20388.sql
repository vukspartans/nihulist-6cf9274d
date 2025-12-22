-- Create email-assets bucket for brand images
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to email assets
CREATE POLICY "Public read access for email assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

-- Allow authenticated users to upload email assets (admin use)
CREATE POLICY "Authenticated users can upload email assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update email assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'email-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete email assets
CREATE POLICY "Authenticated users can delete email assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'email-assets' AND auth.role() = 'authenticated');
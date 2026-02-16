
-- Create storage bucket for payment files
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-files', 'payment-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for payment-files bucket
CREATE POLICY "Authenticated users can upload payment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-files');

CREATE POLICY "Authenticated users can read payment files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-files');

CREATE POLICY "Authenticated users can delete their own payment files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-files');

-- Add explicit RLS policy for entrepreneurs to view RFPs they sent
CREATE POLICY "Entrepreneurs can view RFPs they sent"
ON public.rfps FOR SELECT
USING (sent_by = auth.uid());
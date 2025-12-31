-- Add status column to rfps table for draft/sent tracking
ALTER TABLE public.rfps ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Update existing RFPs to have 'sent' status (they were already sent)
UPDATE public.rfps SET status = 'sent' WHERE status IS NULL OR status = 'draft';

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_rfps_status ON public.rfps(status);

-- Update RLS policy for rfps to allow entrepreneurs to create draft RFPs
DROP POLICY IF EXISTS "Entrepreneurs can create draft RFPs" ON public.rfps;
CREATE POLICY "Entrepreneurs can create draft RFPs" ON public.rfps
FOR INSERT WITH CHECK (auth.uid() = sent_by);

DROP POLICY IF EXISTS "Entrepreneurs can update their RFPs" ON public.rfps;
CREATE POLICY "Entrepreneurs can update their RFPs" ON public.rfps
FOR UPDATE USING (auth.uid() = sent_by);

DROP POLICY IF EXISTS "Entrepreneurs can view their RFPs" ON public.rfps;
CREATE POLICY "Entrepreneurs can view their RFPs" ON public.rfps
FOR SELECT USING (auth.uid() = sent_by);

-- Update RLS for rfp_invites to allow draft creation by entrepreneurs
DROP POLICY IF EXISTS "Entrepreneurs can manage draft invites" ON public.rfp_invites;
CREATE POLICY "Entrepreneurs can manage draft invites" ON public.rfp_invites
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.rfps r
    WHERE r.id = rfp_invites.rfp_id
    AND r.sent_by = auth.uid()
  )
);

-- Update advisor policy to only see non-draft invites
DROP POLICY IF EXISTS "Advisors can view their sent invites" ON public.rfp_invites;
CREATE POLICY "Advisors can view their sent invites" ON public.rfp_invites
FOR SELECT USING (
  status != 'draft'::public.rfp_invite_status AND
  advisor_id IN (SELECT id FROM public.advisors WHERE user_id = auth.uid())
);

-- Update RLS for rfp_request_fee_items to allow management by invite owners
DROP POLICY IF EXISTS "Entrepreneurs can manage fee items" ON public.rfp_request_fee_items;
CREATE POLICY "Entrepreneurs can manage fee items" ON public.rfp_request_fee_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.rfp_invites ri
    JOIN public.rfps r ON r.id = ri.rfp_id
    WHERE ri.id = rfp_request_fee_items.rfp_invite_id
    AND r.sent_by = auth.uid()
  )
);

-- Update RLS for rfp_service_scope_items to allow management by invite owners
DROP POLICY IF EXISTS "Entrepreneurs can manage scope items" ON public.rfp_service_scope_items;
CREATE POLICY "Entrepreneurs can manage scope items" ON public.rfp_service_scope_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.rfp_invites ri
    JOIN public.rfps r ON r.id = ri.rfp_id
    WHERE ri.id = rfp_service_scope_items.rfp_invite_id
    AND r.sent_by = auth.uid()
  )
);
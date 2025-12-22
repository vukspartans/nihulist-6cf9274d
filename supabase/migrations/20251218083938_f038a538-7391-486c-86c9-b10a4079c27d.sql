-- Add payment_terms JSONB column to rfp_invites
ALTER TABLE public.rfp_invites 
ADD COLUMN IF NOT EXISTS payment_terms jsonb DEFAULT '{}'::jsonb;

-- Add service_details_mode column to rfp_invites
ALTER TABLE public.rfp_invites 
ADD COLUMN IF NOT EXISTS service_details_mode text DEFAULT 'free_text';

-- Add service_details_text column to rfp_invites (for free text mode)
ALTER TABLE public.rfp_invites 
ADD COLUMN IF NOT EXISTS service_details_text text;

-- Add service_details_file column to rfp_invites (for file mode)
ALTER TABLE public.rfp_invites 
ADD COLUMN IF NOT EXISTS service_details_file jsonb DEFAULT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rfp_service_scope_items_invite_id 
ON public.rfp_service_scope_items(rfp_invite_id);

CREATE INDEX IF NOT EXISTS idx_rfp_request_fee_items_invite_id 
ON public.rfp_request_fee_items(rfp_invite_id);
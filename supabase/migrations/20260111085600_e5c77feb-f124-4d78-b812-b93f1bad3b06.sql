-- Add email delivery tracking columns to rfp_invites
ALTER TABLE public.rfp_invites 
ADD COLUMN IF NOT EXISTS email_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_last_error TEXT,
ADD COLUMN IF NOT EXISTS email_last_attempt_at TIMESTAMPTZ;

-- Add index for finding failed emails to retry
CREATE INDEX IF NOT EXISTS idx_rfp_invites_email_retry 
ON public.rfp_invites (status, delivered_at, email_attempts) 
WHERE delivered_at IS NULL AND email_attempts < 3;
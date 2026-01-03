-- Add reminder_stage column to track which reminder has been sent
-- 0 = no reminders, 1 = stage 1 (3-day), 2 = stage 2 (7-day), 3 = stage 3 (final)
ALTER TABLE public.rfp_invites 
ADD COLUMN IF NOT EXISTS reminder_stage INTEGER DEFAULT 0;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_rfp_invites_reminder_stage 
ON public.rfp_invites(reminder_stage);

-- Create index for deadline-based queries
CREATE INDEX IF NOT EXISTS idx_rfp_invites_deadline_status 
ON public.rfp_invites(deadline_at, status) 
WHERE status IN ('sent', 'opened', 'in_progress');

-- Create index for created_at filtering
CREATE INDEX IF NOT EXISTS idx_rfp_invites_created_status 
ON public.rfp_invites(created_at, status)
WHERE status IN ('sent', 'opened');

-- Add comment explaining the column
COMMENT ON COLUMN public.rfp_invites.reminder_stage IS 
'Tracks reminder emails sent: 0=none, 1=3-day unopened, 2=7-day no-submission, 3=final deadline';
-- Phase 2: Data Integrity Fixes - Foreign Key Cascades and Notification Queue

-- 1. Add ON DELETE CASCADE to prevent orphaned data
-- Note: We need to drop and recreate constraints with CASCADE

-- Drop existing foreign keys that should cascade
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS fk_proposals_project,
  DROP CONSTRAINT IF EXISTS proposals_project_id_fkey;

ALTER TABLE project_advisors
  DROP CONSTRAINT IF EXISTS fk_project_advisors_project,
  DROP CONSTRAINT IF EXISTS project_advisors_project_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_project_advisors_proposal,
  DROP CONSTRAINT IF EXISTS project_advisors_proposal_id_fkey;

ALTER TABLE rfp_invites
  DROP CONSTRAINT IF EXISTS rfp_invites_rfp_id_fkey;

ALTER TABLE rfps
  DROP CONSTRAINT IF EXISTS rfps_project_id_fkey;

ALTER TABLE project_files
  DROP CONSTRAINT IF EXISTS project_files_project_id_fkey;

ALTER TABLE activity_log
  DROP CONSTRAINT IF EXISTS activity_log_project_id_fkey;

-- Recreate with CASCADE behavior
ALTER TABLE proposals
  ADD CONSTRAINT proposals_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id) 
    ON DELETE CASCADE;

ALTER TABLE project_advisors
  ADD CONSTRAINT project_advisors_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT project_advisors_proposal_id_fkey 
    FOREIGN KEY (proposal_id) 
    REFERENCES proposals(id) 
    ON DELETE SET NULL;

ALTER TABLE rfps
  ADD CONSTRAINT rfps_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id) 
    ON DELETE CASCADE;

ALTER TABLE rfp_invites
  ADD CONSTRAINT rfp_invites_rfp_id_fkey 
    FOREIGN KEY (rfp_id) 
    REFERENCES rfps(id) 
    ON DELETE CASCADE;

ALTER TABLE project_files
  ADD CONSTRAINT project_files_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id) 
    ON DELETE CASCADE;

ALTER TABLE activity_log
  ADD CONSTRAINT activity_log_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id) 
    ON DELETE CASCADE;

-- 2. Create notification queue table for reliable email delivery
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_id UUID,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  entity_type TEXT,
  entity_id UUID,
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for notification queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_status 
  ON notification_queue(status) 
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled 
  ON notification_queue(scheduled_for) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_priority 
  ON notification_queue(priority, scheduled_for) 
  WHERE status = 'pending';

-- RLS policies for notification queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification queue"
  ON notification_queue
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own notifications"
  ON notification_queue
  FOR SELECT
  USING (recipient_id = auth.uid());

-- 3. Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notification_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_queue_updated_at
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_queue_updated_at();

-- 4. Create function to enqueue notifications
CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_notification_type TEXT,
  p_recipient_email TEXT,
  p_recipient_id UUID,
  p_subject TEXT,
  p_body_html TEXT,
  p_template_data JSONB DEFAULT '{}'::jsonb,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_priority INTEGER DEFAULT 5,
  p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notification_queue (
    notification_type,
    recipient_email,
    recipient_id,
    subject,
    body_html,
    template_data,
    entity_type,
    entity_id,
    priority,
    scheduled_for
  )
  VALUES (
    p_notification_type,
    p_recipient_email,
    p_recipient_id,
    p_subject,
    p_body_html,
    p_template_data,
    p_entity_type,
    p_entity_id,
    p_priority,
    p_scheduled_for
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- 5. Add unique partial index to prevent duplicate pending notifications for same entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_unique_pending
  ON notification_queue(notification_type, entity_id, recipient_email)
  WHERE status = 'pending' AND entity_id IS NOT NULL;

COMMENT ON TABLE notification_queue IS 'Queue for reliable email notification delivery with retry logic';
COMMENT ON FUNCTION enqueue_notification IS 'Safely enqueue a notification for asynchronous delivery';
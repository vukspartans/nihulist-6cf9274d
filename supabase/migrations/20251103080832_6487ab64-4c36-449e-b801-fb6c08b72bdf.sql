-- ============================================
-- COMPREHENSIVE RFP SYSTEM MIGRATION
-- ============================================

-- Step 1: Create enum types for status fields
CREATE TYPE public.rfp_invite_status AS ENUM (
  'pending',
  'sent', 
  'opened',
  'in_progress',
  'submitted',
  'declined',
  'expired'
);

CREATE TYPE public.proposal_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'withdrawn'
);

CREATE TYPE public.decline_reason_type AS ENUM (
  'no_capacity',
  'outside_expertise',
  'timeline_conflict',
  'budget_mismatch',
  'other'
);

-- Step 2: Create signatures table
CREATE TABLE public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('proposal', 'agreement', 'amendment')),
  entity_id UUID NOT NULL,
  sign_text TEXT NOT NULL,
  sign_png TEXT NOT NULL,
  sign_vector_json JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  signer_user_id UUID NOT NULL,
  signer_name_snapshot TEXT NOT NULL,
  signer_email_snapshot TEXT NOT NULL,
  signer_ip TEXT,
  user_agent TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_signatures_entity ON public.signatures(entity_type, entity_id);
CREATE INDEX idx_signatures_signer ON public.signatures(signer_user_id);

-- Step 3: Create magic_links table
CREATE TABLE public.magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  purpose TEXT NOT NULL CHECK (purpose IN ('password_reset', 'account_activation', 'rfp_access')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_magic_links_token ON public.magic_links(token);
CREATE INDEX idx_magic_links_user ON public.magic_links(user_id);

-- Step 4: Add new columns to rfp_invites (with temporary names first)
ALTER TABLE public.rfp_invites 
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS decline_reason_temp TEXT,
  ADD COLUMN IF NOT EXISTS decline_note TEXT,
  ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status_temp TEXT DEFAULT 'pending';

-- Migrate existing status data
UPDATE public.rfp_invites SET status_temp = status WHERE status_temp IS NULL;

-- Drop old status column and rename temp
ALTER TABLE public.rfp_invites DROP COLUMN IF EXISTS status;
ALTER TABLE public.rfp_invites RENAME COLUMN status_temp TO status_new;
ALTER TABLE public.rfp_invites 
  ADD COLUMN status public.rfp_invite_status DEFAULT 'pending'::public.rfp_invite_status;

-- Migrate data to enum
UPDATE public.rfp_invites SET status = 
  CASE 
    WHEN status_new = 'pending' THEN 'pending'::public.rfp_invite_status
    WHEN status_new = 'sent' THEN 'sent'::public.rfp_invite_status
    WHEN status_new = 'opened' THEN 'opened'::public.rfp_invite_status
    WHEN status_new = 'in_progress' THEN 'in_progress'::public.rfp_invite_status
    WHEN status_new = 'submitted' THEN 'submitted'::public.rfp_invite_status
    WHEN status_new = 'declined' THEN 'declined'::public.rfp_invite_status
    WHEN status_new = 'expired' THEN 'expired'::public.rfp_invite_status
    ELSE 'pending'::public.rfp_invite_status
  END;

ALTER TABLE public.rfp_invites DROP COLUMN status_new;
ALTER TABLE public.rfp_invites ALTER COLUMN status SET NOT NULL;

-- Add decline_reason as enum
ALTER TABLE public.rfp_invites 
  ADD COLUMN decline_reason public.decline_reason_type;

UPDATE public.rfp_invites SET decline_reason = 
  CASE decline_reason_temp
    WHEN 'no_capacity' THEN 'no_capacity'::public.decline_reason_type
    WHEN 'outside_expertise' THEN 'outside_expertise'::public.decline_reason_type
    WHEN 'timeline_conflict' THEN 'timeline_conflict'::public.decline_reason_type
    WHEN 'budget_mismatch' THEN 'budget_mismatch'::public.decline_reason_type
    WHEN 'other' THEN 'other'::public.decline_reason_type
    ELSE NULL
  END
WHERE decline_reason_temp IS NOT NULL;

ALTER TABLE public.rfp_invites DROP COLUMN IF EXISTS decline_reason_temp;

-- Step 5: Add new columns to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS scope_text TEXT,
  ADD COLUMN IF NOT EXISTS conditions_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS declaration_text TEXT,
  ADD COLUMN IF NOT EXISTS signature_blob TEXT,
  ADD COLUMN IF NOT EXISTS signature_meta_json JSONB,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS amended_from_id UUID REFERENCES public.proposals(id),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS status_temp TEXT DEFAULT 'submitted';

-- Migrate existing status
UPDATE public.proposals SET status_temp = status WHERE status_temp = 'submitted';

-- Drop old status and add enum
ALTER TABLE public.proposals DROP COLUMN IF EXISTS status;
ALTER TABLE public.proposals 
  ADD COLUMN status public.proposal_status DEFAULT 'submitted'::public.proposal_status;

UPDATE public.proposals SET status = 
  CASE status_temp
    WHEN 'draft' THEN 'draft'::public.proposal_status
    WHEN 'submitted' THEN 'submitted'::public.proposal_status
    WHEN 'under_review' THEN 'under_review'::public.proposal_status
    WHEN 'accepted' THEN 'accepted'::public.proposal_status
    WHEN 'rejected' THEN 'rejected'::public.proposal_status
    WHEN 'withdrawn' THEN 'withdrawn'::public.proposal_status
    ELSE 'submitted'::public.proposal_status
  END;

ALTER TABLE public.proposals DROP COLUMN status_temp;
ALTER TABLE public.proposals ALTER COLUMN status SET NOT NULL;

-- Step 6: Add columns to activity_log
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

-- Step 7: Create storage bucket for proposal files
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-files', 'proposal-files', false)
ON CONFLICT (id) DO NOTHING;

-- Step 8: Create database functions
CREATE OR REPLACE FUNCTION public.expire_old_rfp_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rfp_invites
  SET status = 'expired'::public.rfp_invite_status
  WHERE status IN ('pending'::public.rfp_invite_status, 'sent'::public.rfp_invite_status, 'opened'::public.rfp_invite_status)
    AND deadline_at < now()
    AND deadline_at IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_rfp_invitations_to_advisors(
  project_uuid UUID,
  selected_advisor_ids UUID[],
  deadline_hours INTEGER DEFAULT 168,
  email_subject TEXT DEFAULT NULL,
  email_body_html TEXT DEFAULT NULL
)
RETURNS TABLE(rfp_id UUID, invites_sent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_rec RECORD;
  rfp_uuid UUID;
  advisor_rec RECORD;
  invite_count INTEGER := 0;
  advisor_list UUID[];
  final_subject TEXT;
  final_body TEXT;
  personalized_body TEXT;
  deadline_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO project_rec FROM public.projects 
  WHERE id = project_uuid AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  deadline_timestamp := now() + (deadline_hours || ' hours')::INTERVAL;
  
  final_subject := COALESCE(email_subject, 'RFP: ' || project_rec.name);
  final_body := COALESCE(email_body_html, '<h1>' || project_rec.name || '</h1><p>We are seeking proposals for this project.</p>');
  
  INSERT INTO public.rfps (project_id, subject, body_html, sent_by)
  VALUES (project_uuid, final_subject, final_body, auth.uid())
  RETURNING id INTO rfp_uuid;
  
  advisor_list := selected_advisor_ids;
  
  FOR advisor_rec IN 
    SELECT a.*, p.email, p.name 
    FROM public.advisors a
    JOIN public.profiles p ON p.user_id = a.user_id
    WHERE a.id = ANY(advisor_list) AND a.is_active = true
  LOOP
    personalized_body := final_body;
    personalized_body := replace(personalized_body, '{{שם_הפרויקט}}', project_rec.name);
    personalized_body := replace(personalized_body, '{{שם_המשרד}}', COALESCE(advisor_rec.company_name, advisor_rec.name));
    
    INSERT INTO public.rfp_invites (
      rfp_id, 
      advisor_id, 
      email, 
      submit_token, 
      personalized_body_html,
      deadline_at,
      status
    )
    VALUES (
      rfp_uuid,
      advisor_rec.id,
      advisor_rec.email,
      encode(gen_random_bytes(32), 'hex'),
      personalized_body,
      deadline_timestamp,
      'sent'::public.rfp_invite_status
    );
    
    invite_count := invite_count + 1;
  END LOOP;
  
  rfp_id := rfp_uuid;
  invites_sent := invite_count;
  RETURN NEXT;
END;
$$;

-- Step 9: Add RLS policies for signatures
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signatures"
ON public.signatures FOR SELECT
USING (signer_user_id = auth.uid());

CREATE POLICY "Users can create signatures"
ON public.signatures FOR INSERT
WITH CHECK (signer_user_id = auth.uid());

CREATE POLICY "Admins can view all signatures"
ON public.signatures FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 10: Add RLS policies for magic_links
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can validate tokens"
ON public.magic_links FOR SELECT
USING (true);

CREATE POLICY "Admins can manage magic links"
ON public.magic_links FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 11: Update RLS policies for rfp_invites
CREATE POLICY "Advisors can update their invite status"
ON public.rfp_invites FOR UPDATE
USING (advisor_id IN (SELECT id FROM public.advisors WHERE user_id = auth.uid()));

-- Step 12: Update RLS policies for proposals
CREATE POLICY "Advisors can update their own proposals"
ON public.proposals FOR UPDATE
USING (advisor_id IN (SELECT id FROM public.advisors WHERE user_id = auth.uid()));

-- Step 13: Add RLS policies for proposal-files bucket
CREATE POLICY "Advisors can upload proposal files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proposal-files' AND
  auth.uid() IN (
    SELECT a.user_id FROM public.advisors a
    JOIN public.proposals p ON p.advisor_id = a.id
    WHERE (storage.foldername(name))[1] = p.id::text
  )
);

CREATE POLICY "Users can view proposal files for their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposal-files' AND
  (
    auth.uid() IN (
      SELECT a.user_id FROM public.advisors a
      JOIN public.proposals p ON p.advisor_id = a.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
    OR
    auth.uid() IN (
      SELECT pr.owner_id FROM public.projects pr
      JOIN public.proposals p ON p.project_id = pr.id
      WHERE (storage.foldername(name))[1] = p.id::text
    )
  )
);

CREATE POLICY "Admins have full access to proposal files"
ON storage.objects FOR ALL
USING (bucket_id = 'proposal-files' AND has_role(auth.uid(), 'admin'::app_role));

-- Step 14: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_rfp_invites_status ON public.rfp_invites(status);
CREATE INDEX IF NOT EXISTS idx_rfp_invites_deadline ON public.rfp_invites(deadline_at) WHERE deadline_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_advisor ON public.proposals(advisor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log(created_at DESC);

-- Step 15: Add trigger for proposal validation
CREATE OR REPLACE FUNCTION public.validate_proposal_before_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'submitted'::public.proposal_status THEN
    IF NEW.signature_blob IS NULL OR NEW.declaration_text IS NULL THEN
      RAISE EXCEPTION 'Proposals must have a signature and declaration before submission';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_proposal_submission
BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.validate_proposal_before_submit();
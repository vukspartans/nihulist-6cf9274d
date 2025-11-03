-- Step 1: Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Step 2: Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS public.send_rfp_invitations_to_advisors(uuid, uuid[], integer, text, text);

CREATE OR REPLACE FUNCTION public.send_rfp_invitations_to_advisors(
  project_uuid uuid,
  selected_advisor_ids uuid[],
  deadline_hours integer DEFAULT 168,
  email_subject text DEFAULT NULL,
  email_body_html text DEFAULT NULL
)
RETURNS TABLE(rfp_id uuid, invites_sent integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
  random_token TEXT;
BEGIN
  -- Validate and deduplicate input
  IF selected_advisor_ids IS NULL OR array_length(selected_advisor_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No advisors selected for RFP invitations.';
  END IF;

  -- SERVER-SIDE DEDUPLICATION
  advisor_list := ARRAY(SELECT DISTINCT unnest(selected_advisor_ids));
  
  RAISE NOTICE '[RFP] Starting RFP creation with % unique advisors (from % total)', 
    array_length(advisor_list, 1), 
    array_length(selected_advisor_ids, 1);

  -- Get project details
  SELECT * INTO project_rec FROM public.projects 
  WHERE id = project_uuid AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  RAISE NOTICE '[RFP] Project: %, Owner: %', project_rec.name, project_rec.owner_id;
  
  -- Calculate deadline
  deadline_timestamp := now() + (deadline_hours || ' hours')::INTERVAL;
  
  -- Prepare subject and body with placeholder replacement
  final_subject := COALESCE(email_subject, 'RFP: ' || project_rec.name);
  final_subject := replace(final_subject, '{{שם_הפרויקט}}', project_rec.name);
  
  final_body := COALESCE(email_body_html, '<h1>' || project_rec.name || '</h1><p>We are seeking proposals for this project.</p>');
  final_body := replace(final_body, '{{שם_הפרויקט}}', project_rec.name);
  
  -- Create RFP record
  INSERT INTO public.rfps (project_id, subject, body_html, sent_by)
  VALUES (project_uuid, final_subject, final_body, auth.uid())
  RETURNING id INTO rfp_uuid;
  
  RAISE NOTICE '[RFP] Created RFP ID: %', rfp_uuid;
  
  -- Process advisors with LEFT JOIN for profiles
  FOR advisor_rec IN 
    SELECT 
      a.id,
      a.user_id,
      a.company_name,
      a.admin_approved,
      a.is_active,
      COALESCE(p.email, 'noreply@nihulist.co.il') as email,
      COALESCE(p.name, a.company_name, 'Advisor') as name
    FROM public.advisors a
    LEFT JOIN public.profiles p ON p.user_id = a.user_id
    WHERE a.id = ANY(advisor_list) 
      AND a.is_active = true
      AND a.admin_approved = true
  LOOP
    RAISE NOTICE '[RFP] Processing advisor: % (ID: %), Approved: %', 
      advisor_rec.company_name, 
      advisor_rec.id,
      advisor_rec.admin_approved;
    
    -- Personalize body
    personalized_body := final_body;
    personalized_body := replace(personalized_body, '{{שם_המשרד}}', COALESCE(advisor_rec.company_name, advisor_rec.name));
    
    -- Generate token with fallback
    BEGIN
      random_token := encode(extensions.gen_random_bytes(32), 'hex');
    EXCEPTION WHEN OTHERS THEN
      -- Fallback if pgcrypto fails
      random_token := md5(random()::text || clock_timestamp()::text || rfp_uuid::text || advisor_rec.id::text);
      RAISE NOTICE '[RFP] Using fallback token generation';
    END;
    
    -- Insert invitation (unique constraint will prevent duplicates)
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
      random_token,
      personalized_body,
      deadline_timestamp,
      'sent'::public.rfp_invite_status
    )
    ON CONFLICT (rfp_id, advisor_id) DO NOTHING;
    
    IF FOUND THEN
      invite_count := invite_count + 1;
      RAISE NOTICE '[RFP] Invite created. Total: %', invite_count;
    ELSE
      RAISE NOTICE '[RFP] Duplicate invite skipped for advisor %', advisor_rec.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '[RFP] FINAL: % invites created', invite_count;
  
  IF invite_count = 0 THEN
    RAISE WARNING '[RFP] No invites created! Check advisor status (active=true, approved=true)';
  END IF;
  
  -- Return results
  rfp_id := rfp_uuid;
  invites_sent := invite_count;
  RETURN NEXT;
END;
$$;

-- Step 3: Create unique index to prevent duplicate invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_rfp_invites_unique_advisor 
ON public.rfp_invites(rfp_id, advisor_id);

-- Step 4: Clean up existing data with placeholders
UPDATE public.rfps
SET 
  subject = replace(subject, '{{שם_הפרויקט}}', p.name),
  body_html = replace(body_html, '{{שם_הפרויקט}}', p.name)
FROM public.projects p
WHERE rfps.project_id = p.id
  AND (subject LIKE '%{{שם_הפרויקט}}%' OR body_html LIKE '%{{שם_הפרויקט}}%');
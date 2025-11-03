-- PHASE 2: Fix Database Function with LEFT JOIN and Better Validation
-- Drop and recreate the function with improved logic

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
SET search_path TO 'public'
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
  -- Validate input
  IF selected_advisor_ids IS NULL OR array_length(selected_advisor_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No advisors selected for RFP invitations. Array is NULL or empty.';
  END IF;

  advisor_list := selected_advisor_ids;
  RAISE NOTICE 'PHASE 2 FIX - Starting RFP creation with % advisors', array_length(advisor_list, 1);
  RAISE NOTICE 'PHASE 2 FIX - Advisor IDs: %', advisor_list;

  -- Get project details
  SELECT * INTO project_rec FROM public.projects 
  WHERE id = project_uuid AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or access denied for project_id: %, user: %', project_uuid, auth.uid();
  END IF;
  
  RAISE NOTICE 'PHASE 2 FIX - Project found: %, Owner: %', project_rec.name, project_rec.owner_id;
  
  -- Calculate deadline
  deadline_timestamp := now() + (deadline_hours || ' hours')::INTERVAL;
  RAISE NOTICE 'PHASE 2 FIX - Deadline set to: %', deadline_timestamp;
  
  -- Prepare subject and body with placeholder replacement
  final_subject := COALESCE(email_subject, 'RFP: ' || project_rec.name);
  final_subject := replace(final_subject, '{{שם_הפרויקט}}', project_rec.name);
  
  final_body := COALESCE(email_body_html, '<h1>' || project_rec.name || '</h1><p>We are seeking proposals for this project.</p>');
  final_body := replace(final_body, '{{שם_הפרויקט}}', project_rec.name);
  
  RAISE NOTICE 'PHASE 2 FIX - Final subject after replacement: %', final_subject;
  
  -- Create RFP record
  INSERT INTO public.rfps (project_id, subject, body_html, sent_by)
  VALUES (project_uuid, final_subject, final_body, auth.uid())
  RETURNING id INTO rfp_uuid;
  
  RAISE NOTICE 'PHASE 2 FIX - RFP created with ID: %', rfp_uuid;
  
  -- CRITICAL FIX: Use LEFT JOIN for profiles and add admin_approved check
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
    RAISE NOTICE 'PHASE 2 FIX - Processing advisor: % (ID: %), Email: %, Approved: %', 
      advisor_rec.company_name, 
      advisor_rec.id, 
      advisor_rec.email,
      advisor_rec.admin_approved;
    
    -- Personalize body for this advisor
    personalized_body := final_body;
    personalized_body := replace(personalized_body, '{{שם_המשרד}}', COALESCE(advisor_rec.company_name, advisor_rec.name));
    
    RAISE NOTICE 'PHASE 2 FIX - Personalized body created, inserting invite...';
    
    -- Insert invitation
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
    RAISE NOTICE 'PHASE 2 FIX - Invite created successfully. Total count: %', invite_count;
  END LOOP;
  
  RAISE NOTICE 'PHASE 2 FIX - FINAL: Total invites created: %', invite_count;
  
  IF invite_count = 0 THEN
    RAISE WARNING 'PHASE 2 FIX - CRITICAL: No RFP invites were created! Check if advisors exist, are active, and approved.';
  END IF;
  
  -- Return results
  rfp_id := rfp_uuid;
  invites_sent := invite_count;
  RETURN NEXT;
END;
$$;
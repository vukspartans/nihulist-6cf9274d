-- ============================================================
-- PHASE 1: Fix Placeholder Replacement in RFP Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_rfp_invitations_to_advisors(
  project_uuid uuid, 
  selected_advisor_ids uuid[], 
  deadline_hours integer DEFAULT 168, 
  email_subject text DEFAULT NULL::text, 
  email_body_html text DEFAULT NULL::text
)
RETURNS TABLE(rfp_id uuid, invites_sent integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- Get project details
  SELECT * INTO project_rec FROM public.projects 
  WHERE id = project_uuid AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  -- Log project details
  RAISE NOTICE 'Project found: %, Owner: %', project_rec.name, project_rec.owner_id;
  
  -- Calculate deadline
  deadline_timestamp := now() + (deadline_hours || ' hours')::INTERVAL;
  
  -- Prepare subject and body with placeholder replacement for project name
  final_subject := COALESCE(email_subject, 'RFP: ' || project_rec.name);
  final_subject := replace(final_subject, '{{שם_הפרויקט}}', project_rec.name);
  
  final_body := COALESCE(email_body_html, '<h1>' || project_rec.name || '</h1><p>We are seeking proposals for this project.</p>');
  final_body := replace(final_body, '{{שם_הפרויקט}}', project_rec.name);
  
  -- Create RFP record with replaced placeholders
  INSERT INTO public.rfps (project_id, subject, body_html, sent_by)
  VALUES (project_uuid, final_subject, final_body, auth.uid())
  RETURNING id INTO rfp_uuid;
  
  -- Validate advisor list
  advisor_list := selected_advisor_ids;
  RAISE NOTICE 'Advisor list: %, Count: %', advisor_list, array_length(advisor_list, 1);
  
  IF advisor_list IS NULL OR array_length(advisor_list, 1) = 0 THEN
    RAISE EXCEPTION 'No advisors selected for RFP invitations';
  END IF;
  
  -- Log before loop
  RAISE NOTICE 'Starting advisor loop with % advisors', array_length(advisor_list, 1);
  
  -- Create invitations for each advisor
  FOR advisor_rec IN 
    SELECT a.*, p.email, p.name 
    FROM public.advisors a
    JOIN public.profiles p ON p.user_id = a.user_id
    WHERE a.id = ANY(advisor_list) AND a.is_active = true
  LOOP
    -- Log advisor processing
    RAISE NOTICE 'Processing advisor: % (%), Email: %', 
      COALESCE(advisor_rec.company_name, advisor_rec.name), 
      advisor_rec.id, 
      advisor_rec.email;
    
    -- Personalize body for this advisor (replace company name placeholder)
    personalized_body := final_body;
    personalized_body := replace(personalized_body, '{{שם_המשרד}}', COALESCE(advisor_rec.company_name, advisor_rec.name));
    
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
  END LOOP;
  
  -- Log final count
  RAISE NOTICE 'Total invites created: %', invite_count;
  
  IF invite_count = 0 THEN
    RAISE WARNING 'No RFP invites were created - check if advisors exist and are active';
  END IF;
  
  -- Return results
  rfp_id := rfp_uuid;
  invites_sent := invite_count;
  RETURN NEXT;
END;
$function$;
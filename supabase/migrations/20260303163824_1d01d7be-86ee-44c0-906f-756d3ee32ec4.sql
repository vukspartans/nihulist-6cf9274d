CREATE OR REPLACE FUNCTION public.send_rfp_invitations_to_advisors(project_uuid uuid, advisor_type_pairs jsonb, deadline_hours integer DEFAULT 168, email_subject text DEFAULT NULL::text, email_body_html text DEFAULT NULL::text, request_title text DEFAULT NULL::text, request_content text DEFAULT NULL::text, request_files jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(result_rfp_id uuid, result_invites_sent integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  project_rec RECORD;
  rfp_uuid UUID;
  advisor_rec RECORD;
  invite_count INTEGER := 0;
  final_subject TEXT;
  final_body TEXT;
  personalized_body TEXT;
  deadline_timestamp TIMESTAMP WITH TIME ZONE;
  random_token TEXT;
  advisor_pair RECORD;
  personalized_request_title TEXT;
  personalized_request_content TEXT;
BEGIN
  IF advisor_type_pairs IS NULL OR jsonb_array_length(advisor_type_pairs) = 0 THEN
    RAISE EXCEPTION 'No advisors selected for RFP invitations.';
  END IF;

  RAISE NOTICE '[RFP] Starting RFP creation with % advisor-type pairs', jsonb_array_length(advisor_type_pairs);

  SELECT * INTO project_rec FROM public.projects 
  WHERE id = project_uuid AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  RAISE NOTICE '[RFP] Project: %, Owner: %', project_rec.name, project_rec.owner_id;
  
  deadline_timestamp := now() + (deadline_hours || ' hours')::INTERVAL;
  
  final_subject := COALESCE(email_subject, 'RFP: ' || project_rec.name);
  final_subject := replace(final_subject, '{{שם_הפרויקט}}', project_rec.name);
  
  final_body := COALESCE(
    email_body_html, 
    '<div dir="rtl">
      <h1>הזמנה להגשת הצעת מחיר</h1>
      <p>שלום {{שם_המשרד}},</p>
      <p>נשמח לקבל הצעת מחיר עבור הפרויקט: {{שם_הפרויקט}}</p>
      <p><strong>היכנס/י עכשיו למערכת Billding › <a href="https://billding.ai/auth?type=advisor&mode=login">לחץ כאן להתחברות</a></strong></p>
      <p>תודה,<br>צוות Billding</p>
    </div>'
  );
  final_body := replace(final_body, '{{שם_הפרויקט}}', project_rec.name);
  
  INSERT INTO public.rfps (project_id, subject, body_html, sent_by)
  VALUES (project_uuid, final_subject, final_body, auth.uid())
  RETURNING id INTO rfp_uuid;
  
  RAISE NOTICE '[RFP] Created RFP ID: %', rfp_uuid;
  
  FOR advisor_pair IN 
    SELECT * FROM jsonb_to_recordset(advisor_type_pairs) 
    AS x(advisor_id uuid, advisor_type text)
  LOOP
    SELECT 
      a.id,
      a.user_id,
      a.company_name,
      a.admin_approved,
      a.is_active,
      COALESCE(p.email, 'noreply@billding.ai') as email,
      COALESCE(p.name, a.company_name, 'Advisor') as name
    INTO advisor_rec
    FROM public.advisors a
    LEFT JOIN public.profiles p ON p.user_id = a.user_id
    WHERE a.id = advisor_pair.advisor_id 
      AND a.is_active = true
      AND a.admin_approved = true;
    
    IF NOT FOUND THEN
      RAISE NOTICE '[RFP] Skipping advisor % (not found or not approved)', advisor_pair.advisor_id;
      CONTINUE;
    END IF;
    
    RAISE NOTICE '[RFP] Processing advisor: % as % (ID: %)', 
      advisor_rec.company_name, 
      advisor_pair.advisor_type,
      advisor_rec.id;
    
    personalized_body := final_body;
    personalized_body := replace(personalized_body, '{{שם_המשרד}}', COALESCE(advisor_rec.company_name, advisor_rec.name));
    
    -- Personalize request_title and request_content with advisor name
    personalized_request_title := request_title;
    IF personalized_request_title IS NOT NULL THEN
      personalized_request_title := replace(personalized_request_title, '{{שם_המשרד}}', COALESCE(advisor_rec.company_name, advisor_rec.name));
      personalized_request_title := replace(personalized_request_title, '{{שם_הפרויקט}}', project_rec.name);
    END IF;
    
    personalized_request_content := request_content;
    IF personalized_request_content IS NOT NULL THEN
      personalized_request_content := replace(personalized_request_content, '{{שם_המשרד}}', COALESCE(advisor_rec.company_name, advisor_rec.name));
      personalized_request_content := replace(personalized_request_content, '{{שם_הפרויקט}}', project_rec.name);
    END IF;
    
    BEGIN
      random_token := encode(extensions.gen_random_bytes(32), 'hex');
    EXCEPTION WHEN OTHERS THEN
      random_token := md5(random()::text || clock_timestamp()::text || rfp_uuid::text || advisor_rec.id::text);
      RAISE NOTICE '[RFP] Using fallback token generation';
    END;
    
    INSERT INTO public.rfp_invites (
      rfp_id, advisor_id, advisor_type, email, submit_token, personalized_body_html,
      deadline_at, status, request_title, request_content, request_files
    )
    VALUES (
      rfp_uuid, advisor_rec.id, advisor_pair.advisor_type, advisor_rec.email,
      random_token, personalized_body, deadline_timestamp, 'sent'::public.rfp_invite_status,
      personalized_request_title, personalized_request_content, request_files
    )
    ON CONFLICT (rfp_id, advisor_id, advisor_type) DO NOTHING;
    
    IF FOUND THEN
      invite_count := invite_count + 1;
      RAISE NOTICE '[RFP] Invite created. Total: %', invite_count;
    ELSE
      RAISE NOTICE '[RFP] Duplicate invite skipped for advisor % as %', advisor_rec.id, advisor_pair.advisor_type;
    END IF;
  END LOOP;
  
  RAISE NOTICE '[RFP] FINAL: % invites created', invite_count;
  
  IF invite_count = 0 THEN
    RAISE WARNING '[RFP] No invites created! Check advisor status (active=true, approved=true)';
  END IF;
  
  result_rfp_id := rfp_uuid;
  result_invites_sent := invite_count;
  RETURN NEXT;
END;
$function$;
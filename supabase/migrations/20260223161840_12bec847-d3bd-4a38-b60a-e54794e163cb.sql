
-- Fix #1: Replace nihulist.lovable.app with billding.ai in check_task_delay trigger function
CREATE OR REPLACE FUNCTION public.check_task_delay()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid;
  v_owner_email text;
  v_advisor_name text;
  v_project_name text;
  v_task_url text;
  v_body_html text;
  v_planned_date_text text;
  v_delay_days integer;
  v_changes jsonb;
BEGIN
  -- Auto-set status to delayed if planned_end_date has passed and task not completed/cancelled
  IF NEW.status NOT IN ('completed', 'cancelled')
     AND NEW.planned_end_date IS NOT NULL
     AND NEW.planned_end_date < CURRENT_DATE
     AND OLD.status != 'delayed' THEN
    NEW.status := 'delayed';
  END IF;

  -- Only process when transitioning TO delayed
  IF NEW.status = 'delayed' AND OLD.status IS DISTINCT FROM 'delayed' THEN

    -- Calculate delay days
    v_delay_days := CURRENT_DATE - NEW.planned_end_date;

    -- ===== RESCHEDULE PROPOSAL =====
    WITH RECURSIVE downstream AS (
      SELECT td.task_id, td.lag_days, td.lag_days AS accumulated_lag, 1 AS depth
      FROM task_dependencies td
      WHERE td.depends_on_task_id = NEW.id
      UNION ALL
      SELECT td2.task_id, td2.lag_days, d.accumulated_lag + td2.lag_days, d.depth + 1
      FROM task_dependencies td2
      JOIN downstream d ON td2.depends_on_task_id = d.task_id
      WHERE d.depth < 20
    )
    SELECT jsonb_agg(jsonb_build_object(
      'task_id', pt.id,
      'task_name', pt.name,
      'old_start', pt.planned_start_date,
      'new_start', CASE WHEN pt.planned_start_date IS NOT NULL
                        THEN pt.planned_start_date + (v_delay_days + pt.total_lag)
                        ELSE NULL END,
      'old_end', pt.planned_end_date,
      'new_end', CASE WHEN pt.planned_end_date IS NOT NULL
                      THEN pt.planned_end_date + (v_delay_days + pt.total_lag)
                      ELSE NULL END
    ))
    INTO v_changes
    FROM (
      SELECT DISTINCT ON (inner_pt.id)
        inner_pt.id, inner_pt.name,
        inner_pt.planned_start_date, inner_pt.planned_end_date,
        d.accumulated_lag AS total_lag
      FROM downstream d
      JOIN project_tasks inner_pt ON inner_pt.id = d.task_id
      WHERE inner_pt.status NOT IN ('completed', 'cancelled')
      ORDER BY inner_pt.id, d.accumulated_lag DESC
    ) pt;

    IF v_changes IS NOT NULL AND jsonb_array_length(v_changes) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM reschedule_proposals
        WHERE trigger_task_id = NEW.id
          AND status = 'pending'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        INSERT INTO reschedule_proposals (project_id, trigger_task_id, proposed_changes, status, delay_days)
        VALUES (NEW.project_id, NEW.id, v_changes, 'pending', v_delay_days);
      END IF;
    END IF;

    -- ===== ACTIVITY LOG =====
    INSERT INTO activity_log (
      action, actor_type, entity_type, entity_id, project_id, meta
    ) VALUES (
      'task_delayed', 'system', 'task', NEW.id, NEW.project_id,
      jsonb_build_object(
        'task_name', NEW.name,
        'planned_end_date', NEW.planned_end_date,
        'advisor_id', NEW.assigned_advisor_id,
        'delay_days', v_delay_days
      )
    );

    -- ===== EMAIL NOTIFICATION =====
    IF EXISTS (
      SELECT 1 FROM notification_queue
      WHERE entity_type = 'task'
        AND entity_id = NEW.id
        AND notification_type = 'task_delay'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      RETURN NEW;
    END IF;

    SELECT p.owner_id, p.name
    INTO v_owner_id, v_project_name
    FROM projects p
    WHERE p.id = NEW.project_id;

    SELECT pr.email
    INTO v_owner_email
    FROM profiles pr
    WHERE pr.user_id = v_owner_id;

    IF v_owner_email IS NULL THEN
      SELECT au.email
      INTO v_owner_email
      FROM auth.users au
      WHERE au.id = v_owner_id;
    END IF;

    IF NEW.assigned_advisor_id IS NOT NULL THEN
      SELECT a.company_name
      INTO v_advisor_name
      FROM advisors a
      WHERE a.id = NEW.assigned_advisor_id;
    END IF;

    v_advisor_name := COALESCE(v_advisor_name, 'לא שויך');
    v_planned_date_text := TO_CHAR(NEW.planned_end_date, 'DD/MM/YYYY');
    v_task_url := 'https://billding.ai/projects/' || NEW.project_id::text;

    v_body_html := format(
      '<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">⚠️ התראת עיכוב במשימה</h2>
        </div>
        <div style="padding: 20px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>שלום,</p>
          <p>המשימה <strong>%s</strong> בפרויקט <strong>%s</strong> מסומנת כמאחרת.</p>
          <table style="width: 100%%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">תאריך יעד מקורי</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>%s</strong></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">ימי איחור</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>%s</strong></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">יועץ אחראי</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>%s</strong></td></tr>
          </table>
          <a href="%s" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">צפה בפרויקט</a>
        </div>
      </div>',
      NEW.name, v_project_name, v_planned_date_text, v_delay_days::text, v_advisor_name, v_task_url
    );

    IF v_owner_email IS NOT NULL THEN
      INSERT INTO notification_queue (
        notification_type, recipient_email, recipient_id, subject, body_html,
        entity_type, entity_id, priority
      ) VALUES (
        'task_delay', v_owner_email, v_owner_id,
        'התראת עיכוב: ' || NEW.name,
        v_body_html,
        'task', NEW.id, 3
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- Fix #2: Replace nihulist.co.il with billding.ai in send_rfp_invitations_to_advisors
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
      request_title, request_content, request_files
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

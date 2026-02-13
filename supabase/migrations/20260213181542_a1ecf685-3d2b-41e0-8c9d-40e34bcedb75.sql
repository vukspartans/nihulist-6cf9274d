
-- Enhanced check_task_delay() with notification queue and activity logging
CREATE OR REPLACE FUNCTION public.check_task_delay()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_owner_email text;
  v_advisor_name text;
  v_project_name text;
  v_task_url text;
  v_body_html text;
  v_planned_date_text text;
BEGIN
  -- Auto-set status to delayed if planned_end_date has passed and task not completed/cancelled
  IF NEW.status NOT IN ('completed', 'cancelled') 
     AND NEW.planned_end_date IS NOT NULL 
     AND NEW.planned_end_date < CURRENT_DATE 
     AND OLD.status != 'delayed' THEN
    NEW.status := 'delayed';
  END IF;

  -- Only send notification when transitioning TO delayed (not already delayed)
  IF NEW.status = 'delayed' AND OLD.status IS DISTINCT FROM 'delayed' THEN

    -- Check for duplicate: don't notify if we already notified for this task delay
    IF EXISTS (
      SELECT 1 FROM notification_queue
      WHERE entity_type = 'task'
        AND entity_id = NEW.id::text
        AND notification_type = 'task_delay'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      RETURN NEW;
    END IF;

    -- Get project owner and project name
    SELECT p.owner_id, p.name
    INTO v_owner_id, v_project_name
    FROM projects p
    WHERE p.id = NEW.project_id;

    -- Get owner email from profiles
    SELECT pr.email
    INTO v_owner_email
    FROM profiles pr
    WHERE pr.user_id = v_owner_id;

    -- If no email in profiles, try auth.users
    IF v_owner_email IS NULL THEN
      SELECT au.email
      INTO v_owner_email
      FROM auth.users au
      WHERE au.id = v_owner_id;
    END IF;

    -- Get advisor company name
    IF NEW.assigned_advisor_id IS NOT NULL THEN
      SELECT a.company_name
      INTO v_advisor_name
      FROM advisors a
      WHERE a.id = NEW.assigned_advisor_id;
    END IF;

    IF v_advisor_name IS NULL THEN
      v_advisor_name := 'יועץ לא משויך';
    END IF;

    -- Format date for display
    v_planned_date_text := TO_CHAR(NEW.planned_end_date, 'DD/MM/YYYY');

    -- Build task URL
    v_task_url := 'https://nihulist.lovable.app/dashboard?taskId=' || NEW.id::text;

    -- Build HTML email body inline (trigger cannot call React render)
    v_body_html := '<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"></head><body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;direction:rtl">'
      || '<div style="background-color:#ffffff;margin:0 auto;padding:20px 0 48px;max-width:600px;direction:rtl;text-align:right">'
      || '<div style="padding:24px 24px 0;text-align:center;border-bottom:1px solid #e6ebf1;margin-bottom:24px">'
      || '<img src="https://aazakceyruefejeyhkbk.supabase.co/storage/v1/object/public/email-assets/billding-logo.png" width="180" alt="Billding" style="display:block;margin:0 auto 16px;max-width:180px;height:auto" />'
      || '</div>'
      || '<div style="padding:24px">'
      || '<p style="font-size:22px;font-weight:bold;color:#1a1a1a;text-align:right;margin:0 0 16px">⚠️ עיכוב במשימה</p>'
      || '<p style="font-size:15px;line-height:24px;color:#333;text-align:right;margin:0 0 12px">שלום,</p>'
      || '<p style="font-size:15px;line-height:24px;color:#333;text-align:right;margin:0 0 12px">משימה בפרויקט <strong>' || COALESCE(v_project_name, '') || '</strong> סומנה כמעוכבת:</p>'
      || '<div style="background-color:#fef3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin:16px 0">'
      || '<p style="font-size:14px;line-height:22px;color:#333;text-align:right;margin:4px 0"><strong>שם המשימה:</strong> ' || COALESCE(NEW.name, '') || '</p>'
      || '<p style="font-size:14px;line-height:22px;color:#333;text-align:right;margin:4px 0"><strong>תאריך יעד מקורי:</strong> ' || v_planned_date_text || '</p>'
      || '<p style="font-size:14px;line-height:22px;color:#333;text-align:right;margin:4px 0"><strong>יועץ מטפל:</strong> ' || v_advisor_name || '</p>'
      || '</div>'
      || '<hr style="border-color:#e6ebf1;margin:24px 0" />'
      || '<p style="font-size:15px;line-height:24px;color:#333;text-align:right;margin:0 0 12px">מומלץ לבדוק את סטטוס המשימה וליצור קשר עם היועץ המטפל לקבלת עדכון.</p>'
      || '<div style="text-align:center;margin:24px 0"><a href="' || v_task_url || '" style="background-color:#e65100;border-radius:6px;color:#ffffff;display:inline-block;font-size:15px;font-weight:bold;padding:12px 32px;text-decoration:none">צפייה במשימה</a></div>'
      || '</div>'
      || '<div style="padding:24px;border-top:1px solid #e6ebf1;margin-top:32px">'
      || '<p style="color:#8898aa;font-size:12px;line-height:16px;text-align:center;margin:4px 0">צוות Billding - הפלטפורמה המובילה לניהול פרויקטי בנייה</p>'
      || '<p style="color:#8898aa;font-size:12px;line-height:16px;text-align:center;margin:4px 0"><a href="https://billding.ai" style="color:#6772e5;text-decoration:none">billding.ai</a> | <a href="mailto:support@billding.ai" style="color:#6772e5;text-decoration:none">support@billding.ai</a></p>'
      || '</div></div></body></html>';

    -- Insert into notification queue (only if we have an email)
    IF v_owner_email IS NOT NULL THEN
      INSERT INTO notification_queue (
        notification_type,
        recipient_id,
        recipient_email,
        subject,
        body_html,
        template_data,
        entity_type,
        entity_id,
        priority,
        scheduled_for,
        status
      ) VALUES (
        'task_delay',
        v_owner_id,
        v_owner_email,
        'עיכוב במשימה: ' || COALESCE(NEW.name, 'משימה'),
        v_body_html,
        jsonb_build_object(
          'taskId', NEW.id,
          'taskName', NEW.name,
          'plannedEndDate', v_planned_date_text,
          'advisorCompanyName', v_advisor_name,
          'projectName', v_project_name,
          'projectId', NEW.project_id
        ),
        'task',
        NEW.id::text,
        2,
        NOW(),
        'pending'
      );
    END IF;

    -- Log activity
    INSERT INTO activity_log (
      actor_id,
      actor_type,
      action,
      entity_type,
      entity_id,
      project_id,
      meta
    ) VALUES (
      v_owner_id,
      'system',
      'task_delayed',
      'task',
      NEW.id::text,
      NEW.project_id,
      jsonb_build_object(
        'task_name', NEW.name,
        'planned_end_date', NEW.planned_end_date,
        'advisor_name', v_advisor_name,
        'description', 'משימה סומנה כמעוכבת'
      )
    );

  END IF;

  RETURN NEW;
END;
$$;

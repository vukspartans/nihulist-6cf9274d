
CREATE OR REPLACE FUNCTION public.check_task_delay()
RETURNS trigger
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
    v_task_url := 'https://nihulist.lovable.app/projects/' || NEW.project_id::text;

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
$$;

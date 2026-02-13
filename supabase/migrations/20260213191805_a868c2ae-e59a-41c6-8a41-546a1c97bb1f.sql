
-- Create reschedule_proposals table
CREATE TABLE public.reschedule_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trigger_task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  proposed_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  delay_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- Enable RLS
ALTER TABLE public.reschedule_proposals ENABLE ROW LEVEL SECURITY;

-- RLS: project owner can SELECT
CREATE POLICY "Project owner can view reschedule proposals"
  ON public.reschedule_proposals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- RLS: project owner can UPDATE (accept/dismiss)
CREATE POLICY "Project owner can update reschedule proposals"
  ON public.reschedule_proposals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- Index for quick lookups
CREATE INDEX idx_reschedule_proposals_project_status
  ON public.reschedule_proposals(project_id, status);

-- Now enhance check_task_delay() to also create reschedule proposals
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
    -- Find all downstream dependent tasks via recursive CTE and build proposed changes
    WITH RECURSIVE downstream AS (
      SELECT td.task_id, td.lag_days, 1 as depth
      FROM task_dependencies td
      WHERE td.depends_on_task_id = NEW.id
      UNION ALL
      SELECT td2.task_id, td2.lag_days, d.depth + 1
      FROM task_dependencies td2
      JOIN downstream d ON td2.depends_on_task_id = d.task_id
      WHERE d.depth < 20
    )
    SELECT jsonb_agg(jsonb_build_object(
      'task_id', pt.id,
      'task_name', pt.name,
      'old_start', pt.planned_start_date,
      'new_start', CASE WHEN pt.planned_start_date IS NOT NULL
                        THEN pt.planned_start_date + v_delay_days
                        ELSE NULL END,
      'old_end', pt.planned_end_date,
      'new_end', CASE WHEN pt.planned_end_date IS NOT NULL
                      THEN pt.planned_end_date + v_delay_days
                      ELSE NULL END
    ))
    INTO v_changes
    FROM (SELECT DISTINCT ON (pt.id) pt.id, pt.name, pt.planned_start_date, pt.planned_end_date
          FROM downstream d
          JOIN project_tasks pt ON pt.id = d.task_id
          WHERE pt.status NOT IN ('completed', 'cancelled')) pt;

    -- Only insert proposal if there are affected downstream tasks
    IF v_changes IS NOT NULL AND jsonb_array_length(v_changes) > 0 THEN
      -- Avoid duplicate proposals for the same trigger task within 24h
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

    -- ===== EMAIL NOTIFICATION (existing logic) =====
    -- Check for duplicate notification
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

    -- Build HTML email body
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
      || '<div style="padding:24px;text-align:center;border-top:1px solid #e6ebf1">'
      || '<p style="font-size:12px;color:#8898aa;margin:0">הודעה זו נשלחה אוטומטית ממערכת Billding</p>'
      || '</div></div></body></html>';

    -- Insert notification
    IF v_owner_email IS NOT NULL THEN
      INSERT INTO notification_queue (
        notification_type, recipient_email, recipient_id,
        subject, body_html, entity_type, entity_id,
        template_data, priority, status, scheduled_for
      ) VALUES (
        'task_delay', v_owner_email, v_owner_id,
        'עיכוב במשימה: ' || COALESCE(NEW.name, 'משימה'),
        v_body_html, 'task', NEW.id::text,
        jsonb_build_object(
          'taskId', NEW.id,
          'taskName', NEW.name,
          'plannedEndDate', v_planned_date_text,
          'advisorName', v_advisor_name,
          'projectName', v_project_name,
          'taskUrl', v_task_url
        ),
        2, 'pending', NOW()
      );
    END IF;

    -- Log activity
    INSERT INTO activity_log (
      action, actor_type, entity_type, entity_id, project_id,
      meta
    ) VALUES (
      'task_delayed', 'system', 'task', NEW.id::text, NEW.project_id,
      jsonb_build_object(
        'task_name', NEW.name,
        'planned_end_date', NEW.planned_end_date,
        'advisor_id', NEW.assigned_advisor_id
      )
    );

  END IF;

  RETURN NEW;
END;
$$;

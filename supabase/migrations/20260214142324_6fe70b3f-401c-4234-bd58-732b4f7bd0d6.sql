
CREATE OR REPLACE FUNCTION public.auto_unlock_payment_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_milestone_id uuid;
  v_total_critical integer;
  v_done_critical integer;
BEGIN
  -- Only act when status changes TO completed on a payment-critical task
  IF NEW.status = 'completed'
     AND NEW.is_payment_critical = true
     AND NEW.payment_milestone_id IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'completed')
  THEN
    v_milestone_id := NEW.payment_milestone_id;

    -- Count critical tasks for this milestone
    SELECT
      count(*),
      count(*) FILTER (WHERE status IN ('completed', 'cancelled'))
    INTO v_total_critical, v_done_critical
    FROM project_tasks
    WHERE payment_milestone_id = v_milestone_id
      AND is_payment_critical = true;

    -- If all critical tasks are done, unlock the milestone
    IF v_total_critical > 0 AND v_total_critical = v_done_critical THEN
      UPDATE payment_milestones
      SET status = 'due', updated_at = now()
      WHERE id = v_milestone_id
        AND status NOT IN ('due', 'paid');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_unlock_milestone
  AFTER UPDATE OF status ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_unlock_payment_milestone();

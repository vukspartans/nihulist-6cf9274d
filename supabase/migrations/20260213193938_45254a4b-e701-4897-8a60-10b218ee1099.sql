
-- Function: auto-advance project phase when all phase tasks are done
CREATE OR REPLACE FUNCTION public.auto_advance_project_phase()
RETURNS TRIGGER AS $$
DECLARE
  v_project_phase TEXT;
  v_phases TEXT[] := ARRAY[
    'בדיקה ראשונית','הגשת הצעה','תכנון ראשוני','בחתימות',
    'עמידה בתנאי סף','פרסום','בקרה מרחבית','דיון בוועדה',
    'מכון בקרה','בקבלת היתר','באישור תחילת עבודות','ביצוע','הסתיים'
  ];
  v_phase_idx INT;
  v_total INT;
  v_done INT;
BEGIN
  -- Only act when task status changes to completed/cancelled
  IF NEW.status NOT IN ('completed','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  -- Get project's current phase
  SELECT phase INTO v_project_phase FROM projects WHERE id = NEW.project_id;
  IF v_project_phase IS NULL THEN RETURN NEW; END IF;

  -- Find phase index; don't advance if already at last phase
  v_phase_idx := array_position(v_phases, v_project_phase);
  IF v_phase_idx IS NULL OR v_phase_idx >= array_length(v_phases, 1) THEN RETURN NEW; END IF;

  -- Count tasks in current phase
  SELECT count(*), count(*) FILTER (WHERE status IN ('completed','cancelled'))
  INTO v_total, v_done
  FROM project_tasks
  WHERE project_id = NEW.project_id AND phase = v_project_phase;

  -- Advance only if there are tasks and all are done
  IF v_total > 0 AND v_total = v_done THEN
    UPDATE projects SET phase = v_phases[v_phase_idx + 1] WHERE id = NEW.project_id;

    -- Log the event
    INSERT INTO activity_log (action, actor_type, entity_type, entity_id, meta)
    VALUES (
      'phase_advanced',
      'system',
      'project',
      NEW.project_id::text,
      jsonb_build_object(
        'from_phase', v_project_phase,
        'to_phase', v_phases[v_phase_idx + 1],
        'trigger_task_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on project_tasks
DROP TRIGGER IF EXISTS trg_auto_advance_project_phase ON project_tasks;
CREATE TRIGGER trg_auto_advance_project_phase
  AFTER UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_advance_project_phase();

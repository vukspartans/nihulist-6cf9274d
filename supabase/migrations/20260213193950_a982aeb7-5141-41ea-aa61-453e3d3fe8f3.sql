
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
  IF NEW.status NOT IN ('completed','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  SELECT phase INTO v_project_phase FROM public.projects WHERE id = NEW.project_id;
  IF v_project_phase IS NULL THEN RETURN NEW; END IF;

  v_phase_idx := array_position(v_phases, v_project_phase);
  IF v_phase_idx IS NULL OR v_phase_idx >= array_length(v_phases, 1) THEN RETURN NEW; END IF;

  SELECT count(*), count(*) FILTER (WHERE status IN ('completed','cancelled'))
  INTO v_total, v_done
  FROM public.project_tasks
  WHERE project_id = NEW.project_id AND phase = v_project_phase;

  IF v_total > 0 AND v_total = v_done THEN
    UPDATE public.projects SET phase = v_phases[v_phase_idx + 1] WHERE id = NEW.project_id;

    INSERT INTO public.activity_log (action, actor_type, entity_type, entity_id, meta)
    VALUES (
      'phase_advanced', 'system', 'project', NEW.project_id::text,
      jsonb_build_object('from_phase', v_project_phase, 'to_phase', v_phases[v_phase_idx + 1], 'trigger_task_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

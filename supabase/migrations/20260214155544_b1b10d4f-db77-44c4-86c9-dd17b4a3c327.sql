
-- Backfill phase on existing tasks that have a template_id but NULL phase
UPDATE project_tasks pt
SET phase = lp.name
FROM task_templates tt
JOIN licensing_phases lp ON tt.licensing_phase_id = lp.id
WHERE pt.template_id = tt.id
  AND pt.phase IS NULL;

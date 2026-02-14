

# Fix: Second UUID Type Mismatch in `auto_advance_project_phase()` Trigger

## Problem
The previous migration fixed `check_task_delay()`, but there is a **second trigger** on `project_tasks` with the same bug: `auto_advance_project_phase()`.

On line:
```sql
INSERT INTO public.activity_log (action, actor_type, entity_type, entity_id, meta)
VALUES (
  'phase_advanced', 'system', 'project', NEW.project_id::text, ...
);
```

`NEW.project_id::text` is cast to `text`, but `entity_id` is a `uuid` column -- causing the same `42804` error whenever a task completion triggers a project phase advancement.

## Fix (single migration)
Run `CREATE OR REPLACE FUNCTION public.auto_advance_project_phase()` with one change:
- Replace `NEW.project_id::text` with `NEW.project_id` (already uuid, no cast needed)

Everything else in the function remains identical. No code changes needed.


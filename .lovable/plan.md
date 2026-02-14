

# Fix: UUID Type Mismatch in `check_task_delay()` Trigger

## Problem
When marking a task as "completed", the `check_task_delay()` trigger fires and tries to insert `NEW.id::text` into the `activity_log.entity_id` column (type `uuid`). PostgreSQL rejects this with error `42804`. The same `::text` cast is used in a `notification_queue` query comparison.

## Root Cause
Line 87 of `check_task_delay()`:
```sql
'task_delayed', 'system', 'task', NEW.id::text, NEW.project_id, ...
```
`entity_id` is `uuid`, but `NEW.id::text` produces a `text` value. Simply using `NEW.id` (already uuid) fixes it.

## Fix (single migration)
Replace the function body to remove the `::text` casts in two places:

1. **Activity log insert** (line 87): `NEW.id::text` -> `NEW.id`
2. **Notification dedup query** (line 101): `entity_id = NEW.id::text` -> `entity_id = NEW.id`

No code changes needed -- this is purely a database trigger fix.

## Technical Detail
- A `CREATE OR REPLACE FUNCTION` migration will update the existing `check_task_delay()` function
- The trigger binding (`trg_check_task_delay`) stays unchanged
- All other logic (reschedule proposals, email notifications) remains identical


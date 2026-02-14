

# Chunk 1: Task-to-Payment Bridge -- Implementation Plan

## Overview

Four targeted fixes to connect the Task Management module to the Payment module, ensuring that completing tasks correctly unlocks milestones and prevents premature invoicing.

---

## Fix 1: Dependency Check in `handleTaskSubmit` (TaskManagementDashboard)

**Problem:** `handleTaskSubmit` (line 86-130 in `TaskManagementDashboard.tsx`) sends raw updates to Supabase without checking `task_dependencies`. A task can be set to "completed" bypassing the blocking logic that exists in `useProjectTasks.updateTaskStatus()`.

**Solution:** Before executing the Supabase update, if the new status is `completed`, query `task_dependencies` for that task. If any blocking task is not completed/cancelled, show a toast error with the blocker names and return `false`.

**File:** `src/components/tasks/TaskManagementDashboard.tsx`

**Changes:**
- In `handleTaskSubmit`, after line 89 (finding the task), add a dependency check block:
  - Query `task_dependencies` joined with the blocking task's name and status
  - Filter for unfinished blockers (status not in completed/cancelled)
  - If blockers exist, show a toast error listing them and return false
- Also filter out `undefined` values from the `updates` object before sending to Supabase to prevent data corruption

---

## Fix 2: Automatic Milestone Unlocking (DB Trigger)

**Problem:** No backend automation connects task completion to milestone status. When all critical tasks for a milestone are completed, the milestone stays in its current status.

**Solution:** Create a PostgreSQL trigger function on `project_tasks` that fires AFTER UPDATE. When a payment-critical task transitions to `completed`, it checks if ALL tasks linked to the same `payment_milestone_id` with `is_payment_critical = true` are now completed. If so, it updates the milestone status to `due`.

**Database migration:**

```sql
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
```

This trigger:
- Only fires when `status` changes to `completed` on a `is_payment_critical = true` task
- Checks ALL critical tasks linked to the same milestone
- Treats `cancelled` tasks as "done" (consistent with dependency logic)
- Won't downgrade a milestone already at `due` or `paid`

---

## Fix 3: Block Premature Invoicing (CreatePaymentRequestDialog)

**Problem:** `CreatePaymentRequestDialog` (line 173-213) allows submitting a payment request for any milestone regardless of whether linked tasks are complete.

**Solution:** Add a validation step in `handleSubmit`. When a `payment_milestone_id` is selected, query `project_tasks` for that milestone where `is_payment_critical = true` and `status` is not `completed`/`cancelled`. If incomplete tasks exist, block submission with an error alert.

**File:** `src/components/payments/CreatePaymentRequestDialog.tsx`

**Changes:**
- Add state for `incompleteTasksWarning` (string or null)
- In `handleSubmit`, before creating the request:
  - If `formData.payment_milestone_id` is set, query `project_tasks` where `payment_milestone_id` matches and `is_payment_critical = true` and `status NOT IN ('completed', 'cancelled')`
  - If results exist, set the warning message with task names and return early (don't submit)
- Show an inline `Alert` with the warning message above the submit button when active
- Clear the warning when the milestone selection changes

---

## Fix 4: Consultant Task Interaction (AdvisorTasksView)

**Problem:** `AdvisorTasksView` (line 110-113) renders `AllProjectsTaskTable` without `onTaskClick`, so consultants cannot open task details.

**Solution:** Add a `TaskDetailDialog` to `AdvisorTasksView` and wire up the `onTaskClick` handler. Since advisors use the change-request flow (already built into `TaskDetailDialog`), the dialog will work correctly -- advisors see the details and submit changes as requests rather than direct edits.

**File:** `src/components/tasks/AdvisorTasksView.tsx`

**Changes:**
- Add state: `selectedTaskId`, `dialogOpen`, `projectAdvisors`
- Add `handleTaskClick` callback that sets `selectedTaskId` and opens the dialog
- Pass `onTaskClick={handleTaskClick}` to `AllProjectsTaskTable`
- When a task is selected, fetch `project_advisors` for that task's project
- Add `TaskDetailDialog` component with:
  - `onSubmit` that calls Supabase update (the dialog internally handles advisor vs entrepreneur flow via `useTaskChangeRequests`)
  - `onDelete` set to `undefined` (advisors cannot delete tasks)
  - Compute `allProjectTasks` from the current tasks list filtered by the selected task's project

## Fix 5: Pass `onDelete` in TaskBoard

**Problem:** `TaskBoard.tsx` line 280-287 renders `TaskDetailDialog` without `onDelete`, so the delete button is hidden in Kanban view.

**File:** `src/components/tasks/TaskBoard.tsx`

**Change:** Add `onDelete={deleteTask}` to the `TaskDetailDialog` props (line 284). The `deleteTask` function is already destructured from `useProjectTasks` on line 60.

---

## Summary of Files Changed

| File | Change Type |
|---|---|
| `src/components/tasks/TaskManagementDashboard.tsx` | Add dependency check + filter undefined fields in `handleTaskSubmit` |
| `supabase/migrations/[timestamp].sql` | New trigger `auto_unlock_payment_milestone` |
| `src/components/payments/CreatePaymentRequestDialog.tsx` | Add task-completion validation before invoice submission |
| `src/components/tasks/AdvisorTasksView.tsx` | Add `onTaskClick` + `TaskDetailDialog` |
| `src/components/tasks/TaskBoard.tsx` | Add `onDelete={deleteTask}` prop |

## Risk Mitigation

- The DB trigger uses `SECURITY DEFINER` with `SET search_path = public` per project standards
- The trigger only fires on status column changes (not all updates) for performance
- Dependency check in `handleTaskSubmit` mirrors the proven logic from `useProjectTasks.updateTaskStatus`
- Invoice blocking is UI-only validation (defense in depth -- the trigger ensures milestones aren't prematurely set to `due` on the backend side)


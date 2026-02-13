

## Auto-Advance Project Phase When All Phase Tasks Are Completed

### Overview
When all tasks belonging to a project's current licensing phase are marked as "completed" (or "cancelled"), the system will automatically advance the project to the next phase in the `PROJECT_PHASES` sequence. This keeps the `LicensingTimeline` visual indicator in sync with actual task progress.

### Approach
The logic will be implemented as a **database trigger** on the `project_tasks` table. This ensures phase advancement happens regardless of how tasks are completed (via dashboard, Kanban drag-and-drop, or API).

### Step 1: Database Trigger — `auto_advance_project_phase()`

**File:** `supabase/migrations/[timestamp]_auto_advance_project_phase.sql`

A new trigger function that fires `AFTER UPDATE` on `project_tasks` when a task's status changes to `completed` or `cancelled`:

1. Look up the project's current `phase` from the `projects` table
2. Count all tasks in that phase for this project: `SELECT count(*) FROM project_tasks WHERE project_id = X AND phase = current_phase`
3. Count how many of those are finished: `status IN ('completed', 'cancelled')`
4. If all tasks in the current phase are finished AND there is at least one task in the phase, advance the project to the next phase in the `PROJECT_PHASES` array
5. Update `projects.phase` to the next phase
6. Log the advancement in `activity_log`

**Key safeguards:**
- Only fires when `status` actually changes (OLD.status IS DISTINCT FROM NEW.status)
- Only advances if ALL tasks in the phase are done (not just some)
- Requires at least 1 task in the phase (empty phases are not auto-skipped)
- Does not advance past the final phase ("הסתיים")
- Uses the canonical `PROJECT_PHASES` order defined as a SQL array constant

**SQL pseudocode:**
```sql
CREATE OR REPLACE FUNCTION auto_advance_project_phase()
RETURNS TRIGGER AS $$
DECLARE
  v_project_phase TEXT;
  v_phases TEXT[] := ARRAY['בדיקה ראשונית','הגשת הצעה','תכנון ראשוני','בחתימות','עמידה בתנאי סף','פרסום','בקרה מרחבית','דיון בוועדה','מכון בקרה','בקבלת היתר','באישור תחילת עבודות','ביצוע','הסתיים'];
  v_phase_idx INT;
  v_total INT;
  v_done INT;
BEGIN
  -- Only act when task is newly completed/cancelled
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
    INSERT INTO activity_log (entity_type, entity_id, event_type, description)
    VALUES ('project', NEW.project_id, 'phase_advanced',
      'שלב הפרויקט התקדם אוטומטית מ-' || v_project_phase || ' ל-' || v_phases[v_phase_idx + 1]);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Frontend — Refresh Project Data After Task Updates

**File:** `src/hooks/useAllProjectsTasks.ts` (minor edit)

No structural changes needed. The existing `refetch()` already re-fetches projects (including `phase`), so the `LicensingTimeline` will automatically reflect the new phase after any task status change triggers a refetch.

However, to provide **instant visual feedback**, add a toast notification when the project phase changes:

**File:** `src/components/tasks/TaskManagementDashboard.tsx` (minor edit)

After `handleTaskSubmit` succeeds and `refetch()` completes, compare the project's phase before and after. If it changed, show a success toast: "שלב הפרויקט התקדם ל-{new_phase}".

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/[ts]_auto_advance_project_phase.sql` | Create | Trigger function + trigger definition |
| `src/components/tasks/TaskManagementDashboard.tsx` | Edit | Add phase-change detection toast |

### Edge Cases Handled
- **No tasks in phase**: Phase does not advance (requires at least 1 task)
- **Mixed statuses**: Phase only advances when every task in the phase is completed or cancelled
- **Already at final phase**: No-op, trigger exits early
- **Tasks without a phase**: Ignored (only tasks with `phase` matching the project's current phase are counted)
- **Rapid updates**: Each trigger invocation independently checks counts, so concurrent updates are safe


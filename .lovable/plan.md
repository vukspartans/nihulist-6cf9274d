
# Fix Stage-Based Task Management

## Root Cause Analysis

Three distinct problems are causing the "same tasks keep appearing" behavior:

1. **Existing tasks have `phase = NULL`**: The 3 tasks created before our fix have no phase tag, so the phase filter in TaskBoard can't match them to any stage. They appear under every stage (or none).

2. **Stage navigation triggers `StageTaskLoadDialog` which auto-closes when no templates exist**: Only 4 of 13 phases have templates (בדיקה ראשונית, תכנון ראשוני, הגשת בקשה להיתר, ביצוע). Navigating to the other 9 phases opens the dialog, finds nothing, and silently closes -- giving the impression nothing happened.

3. **Phase filter is too aggressive**: When changing stages, the auto-filter hides tasks from other phases. If the current phase has no tasks, users see an empty board with no context.

## Solution

### 1. Fix existing NULL-phase tasks (migration)

Run a one-time UPDATE to backfill `phase` on existing tasks by looking up their `template_id` to the `task_templates` table and joining to `licensing_phases`:

```sql
UPDATE project_tasks pt
SET phase = lp.name
FROM task_templates tt
JOIN licensing_phases lp ON tt.licensing_phase_id = lp.id
WHERE pt.template_id = tt.id
  AND pt.phase IS NULL;
```

This fixes the 3 existing tasks (and any future ones that slipped through).

### 2. Don't auto-open StageTaskLoadDialog when no templates exist

In `ProjectDetail.tsx`, modify `handlePhaseChange` to only open the `StageTaskLoadDialog` when templates actually exist for the new phase. Alternatively (simpler), just remove the auto-close hack in `StageTaskLoadDialog` and instead show a friendly "no templates for this stage" message, then let the user dismiss it. This is better UX than a silently disappearing dialog.

### 3. Remove auto-phase-filter on stage change

The `useEffect` that auto-sets `phaseFilter = projectPhase` is problematic -- when the project is on stage "באישור תחילת עבודות" but all tasks are tagged "בדיקה ראשונית", users see nothing. Instead:

- Remove the auto-filter effect
- Always show **all tasks** by default (phaseFilter = null)
- Keep the phase filter pills for manual filtering
- Show the current project stage as a label/indicator, not as an active filter

### 4. Improve stage navigation UX

When clicking "Next Stage" or "Previous Stage":
- Update the project phase in DB (already works)
- Show the StageTaskLoadDialog only if the new phase has available templates
- Don't force-filter the board to the new phase
- Add a small current-stage indicator label so users know where they are

## Files to Change

| File | Change |
|---|---|
| `supabase/migrations/` | New migration to backfill NULL phases on existing tasks |
| `src/components/tasks/TaskBoard.tsx` | Remove auto-filter useEffect; add current stage label; keep manual phase pills |
| `src/components/tasks/StageTaskLoadDialog.tsx` | Replace silent auto-close with "no templates" message |
| `src/pages/ProjectDetail.tsx` | Minor: no changes needed beyond what TaskBoard handles |

## Technical Details

**TaskBoard.tsx changes:**
- Delete the `useEffect` at lines 90-95 that auto-sets `phaseFilter`
- Add a small "Current stage: X" indicator text near the header
- Keep phase filter pills working as manual toggles (unchanged)

**StageTaskLoadDialog.tsx changes:**
- Remove lines 148-152 (the auto-close setTimeout)
- In the template list, when `templates.length === 0 && !loading`, show: "No templates defined for this stage. You can add tasks manually."
- Add a "Close" button so the user can dismiss

**Migration:**
- Backfill `phase` from `licensing_phases.name` via `task_templates` join for all project_tasks where `phase IS NULL` and `template_id IS NOT NULL`



## Automatic Rescheduling Suggestion for Delayed Tasks

### Overview
When a task is marked as "delayed", the system will calculate the cascade effect on all dependent tasks and present the entrepreneur with a proposal showing updated dates. The entrepreneur can accept (apply all changes), modify individual dates, or dismiss the proposal.

### Architecture

The feature has three parts:
1. **Database table** to store reschedule proposals
2. **Cascade calculation logic** (client-side, in a new hook)
3. **UI banner + review dialog** for the entrepreneur to accept/modify/dismiss

### Step 1: Database Table — `reschedule_proposals`

Create a new table to persist proposals so they survive page reloads:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| project_id | uuid (FK projects) | The affected project |
| trigger_task_id | uuid (FK project_tasks) | The task that was delayed |
| proposed_changes | jsonb | Array of `{ task_id, task_name, old_start, new_start, old_end, new_end }` |
| status | text | 'pending', 'accepted', 'modified', 'dismissed' |
| delay_days | integer | Number of days the trigger task was delayed |
| created_at | timestamptz | |
| reviewed_at | timestamptz | When entrepreneur acted |
| reviewed_by | uuid | |

RLS: Owner of the project can SELECT, UPDATE. INSERT via trigger (SECURITY DEFINER).

### Step 2: Database Trigger Enhancement

Extend the `check_task_delay()` function to also:
1. When a task transitions to 'delayed', calculate `delay_days = CURRENT_DATE - planned_end_date`
2. Query `task_dependencies` to find all downstream tasks (tasks that depend on this delayed task, recursively)
3. For each downstream task, compute new dates by shifting `planned_start_date` and `planned_end_date` forward by `delay_days + lag_days`
4. Insert a single row into `reschedule_proposals` with the full proposed_changes array
5. Only create a proposal if there are downstream dependent tasks affected

### Step 3: Client-Side Hook — `useRescheduleProposals`

A new hook that:
- Fetches pending proposals for the current project(s)
- Provides `acceptProposal(id)` — applies all proposed date changes via batch update
- Provides `acceptWithModifications(id, changes)` — applies user-modified dates
- Provides `dismissProposal(id)` — marks as dismissed
- Auto-refetches task list after applying changes

### Step 4: UI Components

**A. `RescheduleBanner` component**
Displayed at the top of `TaskManagementDashboard` (similar to `AutoTaskSuggestionBanner`):
- Shows when there are pending reschedule proposals
- Orange/warning styling with calendar icon
- Text: "זוהה עיכוב במשימה '{task_name}' — {N} משימות תלויות מושפעות. סקור את ההצעה לעדכון לוח זמנים."
- Buttons: "סקור הצעה" (opens dialog) | "התעלם" (dismisses)

**B. `RescheduleReviewDialog` component**
A dialog showing:
- Header: which task caused the delay and by how many days
- Table with columns: Task Name | Original Start | Proposed Start | Original End | Proposed End
- Each date field is editable (date input) so the entrepreneur can modify
- Footer buttons: "אשר עדכון" (accept) | "בטל" (cancel)
- On accept: batch-update all affected tasks' planned dates and sync payment milestones

### Step 5: Integration into Dashboard

In `TaskManagementDashboard.tsx`:
- Import and render `RescheduleBanner` between the status summary row and the timeline
- Pass `refetch` callback so task list refreshes after accepting a proposal

### Technical Details

**Cascade Calculation (in SQL trigger):**
```sql
-- Recursive CTE to find all downstream tasks
WITH RECURSIVE downstream AS (
  SELECT td.task_id, td.lag_days
  FROM task_dependencies td
  WHERE td.depends_on_task_id = NEW.id
  UNION ALL
  SELECT td2.task_id, td2.lag_days
  FROM task_dependencies td2
  JOIN downstream d ON td2.depends_on_task_id = d.task_id
)
SELECT DISTINCT pt.id, pt.name, pt.planned_start_date, pt.planned_end_date
FROM downstream d
JOIN project_tasks pt ON pt.id = d.task_id
WHERE pt.status NOT IN ('completed', 'cancelled');
```

Each downstream task's dates shift by `delay_days` (calculated as `CURRENT_DATE - trigger_task.planned_end_date`).

**Batch update on accept:**
```typescript
// For each proposed change, update the task
for (const change of proposal.proposed_changes) {
  await supabase.from('project_tasks').update({
    planned_start_date: change.new_start,
    planned_end_date: change.new_end,
  }).eq('id', change.task_id);
  
  // Also sync payment milestone if linked
}
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/[ts]_reschedule_proposals.sql` | Create | New table + RLS + trigger enhancement |
| `src/hooks/useRescheduleProposals.ts` | Create | Fetch/accept/dismiss proposals |
| `src/components/tasks/RescheduleBanner.tsx` | Create | Warning banner for pending proposals |
| `src/components/tasks/RescheduleReviewDialog.tsx` | Create | Date review/edit dialog |
| `src/components/tasks/TaskManagementDashboard.tsx` | Edit | Add RescheduleBanner |

### User Flow

1. Task "הגשת תכניות" has `planned_end_date = Feb 10` but it's Feb 13 -- trigger marks it as delayed
2. Trigger finds 3 downstream tasks via dependencies and calculates 3-day shift for each
3. `reschedule_proposals` row is created with proposed new dates
4. Entrepreneur opens dashboard, sees orange banner: "זוהה עיכוב של 3 ימים במשימה 'הגשת תכניות' — 3 משימות מושפעות"
5. Clicks "סקור הצעה", sees table with old vs. new dates
6. Can adjust any date, then clicks "אשר עדכון"
7. All downstream task dates are updated, payment milestones synced, proposal marked as 'accepted'

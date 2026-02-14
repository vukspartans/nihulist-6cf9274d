

# Assessment: Licensing Task Management -- Current State vs. Vision

## What's Already Built (90% Complete)

The system already implements most of the described requirements:

| Requirement | Status | Where |
|---|---|---|
| Task board per project type | Done | `TaskBoard`, `LoadTaskTemplatesDialog` |
| Template-based task generation | Done | `useBulkTaskCreation`, seeded templates |
| Add/remove tasks | Done | `CreateTaskDialog`, delete in `TaskBoard` |
| Assign consultants to tasks | Done | `TaskAssignment`, auto-assign by specialty |
| Payment milestones per task | Done | `payment_milestones`, `is_payment_critical` flag |
| Visual timeline (phases) | Done | `LicensingTimeline` (13 phases) |
| Real-time progress tracking | Done | `auto_advance_project_phase` trigger |
| Delay detection | Done | `check_task_delay` database trigger |
| Delay notifications | Done | `task-delay-notification` email template |
| Auto-reschedule proposals | Done | `useRescheduleProposals`, cascade calculation |
| Cash flow forecast | Done | `CashFlowChart` (projected vs actual) |
| Task dependencies | Done | `task_dependencies` with blocking enforcement |
| Plan vs. Actual dates | Done | `planned_start/end` vs `actual_start/end` fields |

## Remaining Gaps (3 Items)

### 1. Contract-to-Task Advisor Linkage

Currently advisors are assigned to tasks manually or by specialty matching. There's no automatic linkage from an approved proposal/contract to task assignments -- i.e., when an advisor's proposal is approved, their tasks should auto-populate with that advisor assigned.

**Changes:**
- Add a post-approval hook in `useProposalApproval` that, after approving a proposal, checks if the project has tasks matching the advisor's specialty and auto-assigns the advisor to those tasks.
- Show a "linked from contract" indicator on auto-assigned tasks.

**Files:** `src/hooks/useProposalApproval.ts`, `src/components/tasks/TaskCard.tsx`

### 2. Plan vs. Actual Visual Comparison in Timeline

The `LicensingTimeline` shows phase progress but doesn't visually compare planned vs. actual dates per task. A small enhancement to the task table would add a "variance" column showing days ahead/behind schedule.

**Changes:**
- Add a computed "variance" column to `AllProjectsTaskTable` showing the difference between `planned_end_date` and `actual_end_date` (or today if in progress).
- Color-code: green (ahead), red (behind), gray (on track).

**Files:** `src/components/tasks/AllProjectsTaskTable.tsx`

### 3. Auto-Generate Tasks on Project Creation

Currently tasks are only loaded manually via the "Load from Templates" button. The vision describes automatic generation when a project is opened.

**Changes:**
- In `ProjectDetail.tsx`, when the Tasks tab is first opened and the project has zero tasks, automatically trigger the `LoadTaskTemplatesDialog` (or show the `AutoTaskSuggestionBanner` more prominently).
- Alternative: Add a one-time trigger in the project creation wizard (`ProjectWizard.tsx`) that calls `createTasksFromTemplates` with matching templates.

**Files:** `src/pages/ProjectWizard.tsx` or `src/components/tasks/TaskBoard.tsx`

## Implementation Priority

1. **Variance column** -- Small, high-value visual improvement (1 file edit)
2. **Contract-to-task linkage** -- Medium effort, connects procurement to execution (2 file edits)
3. **Auto-generate on creation** -- Small UX improvement (1 file edit)

## Technical Notes

- All database tables, triggers, and RLS policies needed for this system are already in place
- No new database migrations are required for items 1-3
- The existing `useBulkTaskCreation` hook handles task generation with advisor auto-assignment by specialty
- The `syncPaymentMilestone` pattern in `useProjectTasks` already keeps financial data in sync with schedule changes


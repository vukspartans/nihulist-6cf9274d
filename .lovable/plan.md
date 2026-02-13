

## Plan: Advanced Permissions, Automations, Payments & Notifications

This plan covers the remaining gaps from the requirements document, organized into 4 work streams with clear priorities.

---

### Stream 1: UI Notifications & Badges (Section 6.3) -- Quick Win

**Goal:** Show open task count badges next to each project name throughout the UI.

**Changes:**

1. **`src/pages/Dashboard.tsx`** -- Add task count badges to project list
   - After fetching projects, query `project_tasks` grouped by `project_id` to get open task counts (status not in completed/cancelled)
   - Display a small numeric badge next to each project name in both mobile card and desktop table views
   - Add badge next to "All Projects" filter showing total open tasks

2. **`src/components/tasks/TaskManagementDashboard.tsx`** -- Badge in project selector
   - Show open task count next to each project name in the project dropdown selector

---

### Stream 2: Critical Task Deletion Warning (Section 3.3) -- Quick Win

**Goal:** When deleting a task marked as `is_payment_critical`, show a mandatory confirmation warning.

**Changes:**

1. **`src/components/tasks/TaskDetailDialog.tsx`** -- Add delete button with critical task warning
   - Add a "Delete Task" button in the dialog footer
   - If `task.is_payment_critical === true`, show an AlertDialog: "This task is linked to a payment milestone. Are you sure you want to delete it?"
   - Regular tasks show a standard confirmation

2. **`src/components/tasks/ProjectTaskView.tsx`** -- Add delete action in card view
   - Add delete option with same critical task warning logic

3. **`src/hooks/useProjectTasks.ts`** -- No changes needed (deleteTask already exists)

---

### Stream 3: Advisor Edit Approval Flow (Section 3.3) -- Medium Effort

**Goal:** When an advisor modifies a task assigned to them, the change requires entrepreneur approval before saving.

**Database Changes (new migration):**

1. **New table: `task_change_requests`**
   - `id` (uuid, PK)
   - `task_id` (uuid, FK to project_tasks)
   - `requested_by` (uuid, FK to auth.users)
   - `requested_changes` (jsonb -- stores the diff of proposed changes)
   - `status` ('pending' | 'approved' | 'rejected')
   - `reviewed_by` (uuid, nullable)
   - `reviewed_at` (timestamptz, nullable)
   - `review_note` (text, nullable)
   - `created_at` (timestamptz)
   - RLS: Advisors can INSERT for their own tasks, entrepreneurs can UPDATE (approve/reject) for their own projects

**New Files:**

2. **`src/hooks/useTaskChangeRequests.ts`**
   - Fetch pending change requests for a project
   - Submit a change request (advisor flow)
   - Approve/reject a change request (entrepreneur flow)

3. **`src/components/tasks/PendingChangesNotification.tsx`**
   - Small banner/badge in TaskManagementDashboard showing "X pending change requests"
   - Clicking opens a review dialog

4. **`src/components/tasks/ChangeRequestReviewDialog.tsx`**
   - Shows proposed changes vs current values side-by-side
   - Approve/Reject buttons for entrepreneur

**Modified Files:**

5. **`src/components/tasks/TaskDetailDialog.tsx`**
   - Detect if current user is an advisor (via `useAuth`)
   - If advisor: instead of saving directly, create a `task_change_request`
   - Show toast: "Your changes have been submitted for approval"

6. **`src/components/tasks/AdvisorTasksView.tsx`**
   - Show pending change request status on tasks that have pending requests

---

### Stream 4: Payments & Cash Flow (Sections 6.1, 6.2) -- Larger Effort

**Goal:** Auto-calculate payment forecasts from task dates, show graphical cash flow timeline, and alert advisors when they can submit invoices.

**Sub-features:**

#### 4A. Auto-recalculate payment forecasts when task dates change

1. **`src/hooks/useProjectPayments.ts`** -- Add `recalculateForecasts` function
   - When a task with `payment_milestone_id` has its `planned_end_date` changed, update the linked milestone's `due_date`
   - Recalculate payment summary totals

2. **`src/hooks/useProjectTasks.ts`** -- Trigger forecast recalculation
   - After `updateTask` with date changes on a payment-critical task, call the recalculation

#### 4B. Cash Flow Forecast Graph

3. **`src/components/payments/CashFlowChart.tsx`** (new)
   - Use `recharts` (already installed) to render a bar/area chart
   - X-axis: months, Y-axis: cumulative payment amounts
   - Data source: payment milestones with due_dates and amounts
   - Updates automatically when milestone dates change

4. **`src/components/payments/PaymentDashboard.tsx`** -- Integrate chart
   - Add CashFlowChart above or below the milestone list

#### 4C. Invoice submission alerts (Section 6.2)

5. **`src/components/tasks/TaskDetailDialog.tsx`** -- Show invoice alert
   - When a task is completed AND `is_payment_critical === true`, show a green banner: "This milestone is complete. The advisor can submit an invoice."

6. **`src/components/payments/PaymentDashboard.tsx`** -- Show invoice-ready milestones
   - Highlight milestones where all linked tasks are completed
   - Show alert banner for advisor: "You may submit an invoice for these milestones"

---

### Stream 5: Advisor Office Roles (Section 5.1) -- Deferred

**Goal:** Manager/Employee hierarchy within advisor firms.

This requires significant schema changes (office membership table, role within office, visibility rules) and is recommended as a separate phase. Current implementation treats all advisors as independent.

**Recommendation:** Defer to next sprint.

---

### Stream 6: Email/CC Automations (Sections 3.1, 5.2) -- Deferred

**Goal:** Auto-link emails to tasks, auto-assign advisors by expertise, CC functionality.

This requires email integration infrastructure (webhook/IMAP parsing) that is not yet in place. The CC feature requires a new `task_observers` table.

**Recommendation:** Defer to next sprint. Can implement the CC/observer table now if desired.

---

### Implementation Priority Order

| Priority | Feature | Effort | Files |
|----------|---------|--------|-------|
| 1 | Task count badges (6.3) | Small | 2 files modified |
| 2 | Critical task delete warning (3.3) | Small | 2 files modified |
| 3 | Cash flow chart (6.1) | Medium | 1 new + 2 modified |
| 4 | Invoice alerts (6.2) | Small | 2 files modified |
| 5 | Advisor edit approval (3.3) | Large | 1 migration + 4 new + 2 modified |
| 6 | Office roles (5.1) | Large | Deferred |
| 7 | Email/CC automations (3.1, 5.2) | Large | Deferred |

---

### Technical Details

**Migration for task_change_requests:**
```text
CREATE TABLE task_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES project_tasks(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  requested_changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_change_requests ENABLE ROW LEVEL SECURITY;

-- Advisors can create requests for tasks assigned to them
CREATE POLICY "advisor_insert_own" ON task_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Entrepreneurs can view/update requests for their projects
CREATE POLICY "entrepreneur_manage" ON task_change_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_tasks pt
      JOIN projects p ON p.id = pt.project_id
      WHERE pt.id = task_change_requests.task_id
      AND p.owner_id = auth.uid()
    )
  );

-- Advisors can view their own requests
CREATE POLICY "advisor_view_own" ON task_change_requests
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid());
```

**Cash Flow Chart data structure:**
```text
interface CashFlowDataPoint {
  month: string;        // "2026-03"
  projected: number;    // sum of milestone amounts due that month
  actual: number;       // sum of paid amounts that month
  cumProjected: number; // running total
  cumActual: number;    // running total
}
```

**Badge query for open task counts:**
```text
SELECT project_id, COUNT(*) as open_count
FROM project_tasks
WHERE project_id IN (...projectIds)
AND status NOT IN ('completed', 'cancelled')
GROUP BY project_id
```


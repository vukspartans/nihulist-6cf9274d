

## Plan: Task-Milestone Sync, Template Personalization, Task CC/Observers, Auto-Assignment

This plan implements Priorities 1 and 2 from the gap analysis. Priorities marked "Deferred" (Email Integration, Office Hierarchy) are excluded.

---

### Feature 1: Sync Task Dates to Payment Milestones (Small)

When a task with `payment_milestone_id` has its `planned_end_date` changed, automatically update the linked `payment_milestones.due_date`.

**Changes:**

1. **`src/hooks/useProjectTasks.ts`** -- In `updateTask()`, after the main update succeeds, check if the task has a `payment_milestone_id` and if `planned_end_date` changed. If so, update `payment_milestones.due_date` to match.

2. **`src/components/tasks/TaskManagementDashboard.tsx`** -- Same logic in `handleTaskSubmit()`, since this component updates tasks directly via supabase rather than through `useProjectTasks`.

---

### Feature 2: Task Template Personalization (Medium)

Save user customizations to tasks and suggest them as defaults for future projects.

**Database (new migration):**

- **New table: `user_task_preferences`**
  - `id` (uuid PK)
  - `user_id` (uuid FK auth.users)
  - `template_id` (uuid FK task_templates, nullable)
  - `task_name` (text) -- original template task name for matching
  - `custom_name` (text, nullable)
  - `custom_description` (text, nullable)
  - `custom_duration_days` (int, nullable)
  - `custom_advisor_specialty` (text, nullable)
  - `custom_notes` (text, nullable)
  - `project_type` (text) -- so preferences are per project type
  - `usage_count` (int default 1) -- how many times this customization was used
  - `created_at`, `updated_at`
  - RLS: users can only read/write their own rows

**New files:**

- **`src/hooks/useTaskPersonalization.ts`**
  - `saveCustomization(taskName, templateId, projectType, customFields)` -- upserts into `user_task_preferences`
  - `getPersonalizations(projectType)` -- fetches stored preferences for current user and project type
  - `applyPersonalizations(templates, personalizations)` -- merges stored preferences onto template defaults

**Modified files:**

- **`src/hooks/useBulkTaskCreation.ts`** -- After creating tasks from templates, call `saveCustomization` if user has made changes. When loading templates, apply stored personalizations as defaults.

- **`src/hooks/useAutoTaskLoader.ts`** -- Before presenting templates, fetch user personalizations and merge them so the suggestion shows the user's previously customized values.

- **`src/components/tasks/TaskDetailDialog.tsx`** -- When saving a task that was created from a template (`template_id` is set), save the diff as a personalization for future use.

---

### Feature 3: Task Observer/CC Table (Medium)

Allow entrepreneurs to CC additional advisors on tasks they are not directly assigned to.

**Database (new migration -- same migration file as Feature 2):**

- **New table: `task_observers`**
  - `id` (uuid PK)
  - `task_id` (uuid FK project_tasks ON DELETE CASCADE)
  - `advisor_id` (uuid FK advisors)
  - `added_by` (uuid FK auth.users)
  - `created_at`
  - UNIQUE(task_id, advisor_id)
  - RLS: project owner can manage; observers can SELECT their own

**New files:**

- **`src/hooks/useTaskObservers.ts`**
  - `fetchObservers(taskId)` -- returns list of CC'd advisors with company_name
  - `addObserver(taskId, advisorId)` -- inserts into task_observers
  - `removeObserver(taskId, advisorId)` -- deletes from task_observers

- **`src/components/tasks/TaskObserversSection.tsx`**
  - Renders inside TaskDetailDialog as a new section/tab
  - Shows list of CC'd advisors with remove button
  - Dropdown to add new observer from project advisors list
  - Only visible to entrepreneurs (not advisors)

**Modified files:**

- **`src/components/tasks/TaskDetailDialog.tsx`** -- Add a "מכותבים" (CC) tab or section showing TaskObserversSection

- **`src/components/tasks/AdvisorTasksView.tsx`** -- When fetching advisor tasks, also fetch tasks where the advisor is an observer (via `task_observers` table) and show them in a separate "CC'd Tasks" section

---

### Feature 4: Field-to-Advisor Auto-Assignment (Medium)

When a task template has `advisor_specialty` set, automatically link the matching project advisor.

**Modified files:**

- **`src/hooks/useBulkTaskCreation.ts`** -- When creating tasks from templates:
  1. Fetch project advisors with their expertise fields
  2. For each template with `advisor_specialty`, find the matching project advisor whose `expertise` array contains that specialty
  3. Set `assigned_advisor_id` on the created task automatically
  - Currently the hook just stores "יועץ נדרש: {specialty}" in notes; change this to actual assignment

- **`src/components/tasks/CreateTaskDialog.tsx`** -- When user selects a "field of responsibility" (phase/specialty), auto-populate the advisor assignment dropdown with matching advisors from the project

---

### Implementation Order

| Step | Feature | Files Changed |
|------|---------|---------------|
| 1 | Task-Milestone date sync | 2 modified |
| 2 | Task Observer/CC | 1 migration + 2 new + 2 modified |
| 3 | Auto-assignment by field | 2 modified |
| 4 | Template personalization | same migration + 1 new + 3 modified |

---

### Technical Details

**Migration SQL (single migration for Features 2-3):**

```text
-- Task Observers / CC
CREATE TABLE task_observers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES project_tasks(id) ON DELETE CASCADE NOT NULL,
  advisor_id uuid REFERENCES advisors(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, advisor_id)
);

ALTER TABLE task_observers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_owner_manage_observers" ON task_observers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_tasks pt
      JOIN projects p ON p.id = pt.project_id
      WHERE pt.id = task_observers.task_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "observer_view_own" ON task_observers
  FOR SELECT TO authenticated
  USING (
    advisor_id IN (
      SELECT id FROM advisors WHERE user_id = auth.uid()
    )
  );

-- User Task Preferences (personalization)
CREATE TABLE user_task_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL,
  task_name text NOT NULL,
  custom_name text,
  custom_description text,
  custom_duration_days integer,
  custom_advisor_specialty text,
  custom_notes text,
  project_type text NOT NULL,
  usage_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_task_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_preferences" ON user_task_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Date sync logic (pseudo-code for useProjectTasks.updateTask):**

```text
// After successful task update:
if (updates.planned_end_date) {
  const task = tasks.find(t => t.id === taskId);
  if (task?.payment_milestone_id) {
    await supabase
      .from('payment_milestones')
      .update({ due_date: updates.planned_end_date })
      .eq('id', task.payment_milestone_id);
  }
}
```

**Auto-assignment logic (in useBulkTaskCreation):**

```text
// Fetch project advisors with expertise
const { data: projectAdvisors } = await supabase
  .from('project_advisors')
  .select('advisor_id, advisors(expertise)')
  .eq('project_id', projectId)
  .eq('status', 'active');

// For each template with advisor_specialty:
const matchingAdvisor = projectAdvisors?.find(pa =>
  pa.advisors?.expertise?.includes(template.advisor_specialty)
);
if (matchingAdvisor) {
  taskRow.assigned_advisor_id = matchingAdvisor.advisor_id;
}
```

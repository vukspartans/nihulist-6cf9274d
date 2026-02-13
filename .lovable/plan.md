
## Implement Task Delay Notifications to Entrepreneurs

### Problem
When a task is automatically marked as "delayed" by the `check_task_delay()` trigger, there is no mechanism to notify the project owner (entrepreneur) about the delay, the affected task, deadline, or assigned advisor. This creates a gap between backend task status tracking and user awareness.

### Solution Architecture

The implementation will create an **event-driven notification system** using:
1. **Database Trigger** — Enhanced `check_task_delay()` to insert into `notification_queue`
2. **Email Template** — New React component for task delay notification
3. **Edge Function** — Existing `process-notification-queue` handles delivery
4. **Activity Logging** — Track delay events in `activity_log` for auditing

### Data Relationships

```
project_tasks
├── project_id → projects.id
├── assigned_advisor_id → advisors.id
└── projects.owner_id → profiles.user_id (entrepreneur email)

notification_queue
├── recipient_id (project owner's user_id)
├── recipient_email (entrepreneur email)
├── entity_type = "task_delay"
├── entity_id = task_id
└── template_data {taskId, taskName, plannedEndDate, advisorCompanyName}
```

### Implementation Steps

#### Step 1: Create Task Delay Email Template
**File:** `supabase/functions/_shared/email-templates/task-delay-notification.tsx`
- Display task name prominently
- Show original deadline (planned_end_date)
- Display assigned advisor's company name
- Include link to task detail in the dashboard (/dashboard?taskId=xxx)
- Use existing `EmailLayout` component with Billding branding
- Hebrew copy: "עיכוב במשימה", "תאריך יעד מקורי", "יועץ מטופל"

#### Step 2: Enhance Task Delay Detection Trigger
**File:** `supabase/migrations/[timestamp]_task_delay_notifications.sql`

Modify the `check_task_delay()` function to:
1. Detect when status transitions from non-delayed → delayed
2. Query the project owner's email via: `projects.owner_id → profiles.user_id → auth.users.email`
3. Query the assigned advisor's company_name via: `assigned_advisor_id → advisors.company_name`
4. Insert row into `notification_queue` with:
   - `notification_type` = 'task_delay'
   - `recipient_id` = project owner's user_id
   - `recipient_email` = entrepreneur's email
   - `subject` = "עיכוב במשימה: {task_name}"
   - `body_html` = rendered email template
   - `template_data` = JSON with taskId, taskName, plannedEndDate, advisorName, projectName
   - `entity_type` = 'task'
   - `entity_id` = task_id
   - `priority` = 2 (high priority)
   - `scheduled_for` = NOW() (send immediately)

5. Log activity event:
   - `entity_type` = 'task'
   - `entity_id` = task_id
   - `event_type` = 'task_delayed'
   - `description` = "משימה סומנה כעיכובה"

**Technical Details:**
- Use `SECURITY DEFINER` for email query permissions
- Handle NULL values gracefully (if advisor not assigned, use "יועץ בלתי מוגדר")
- Use EXISTS check to avoid duplicate notifications on retry updates

#### Step 3: Create Database Migration
**Purpose:** Define the new trigger logic with proper transaction handling

The migration will:
- Replace the existing `check_task_delay()` function with enhanced version
- Keep the trigger definition unchanged (`check_project_task_delay`)
- Ensure idempotency (no duplicate notifications if trigger fires multiple times)
- Add audit logging to activity_log table

#### Step 4: Leverage Existing Infrastructure
- **Notification Queue Processing:** The existing `process-notification-queue` edge function already handles:
  - Batch processing with retry logic
  - Exponential backoff for failed deliveries
  - Status tracking (pending → processing → sent/failed)
  - Maximum retry attempts (default 3)
- **No new edge function needed** — reuse existing processor

### Key Design Decisions

1. **Trigger-Based Detection** — Automatic detection when task.status is updated, no manual intervention needed
2. **Queue-Based Delivery** — Decouples notification creation from email sending (async processing)
3. **Entrepreneur-Only Notifications** — Only project owners receive notifications (not advisors, who can view tasks in their own dashboard)
4. **High Priority** — Set to priority 2 to ensure delays are notified quickly
5. **Activity Logging** — Creates audit trail of when delays were detected and notified
6. **Hebrew Content** — All email copy and templates use Hebrew for Israeli users

### Data Flow Diagram

```
project_tasks UPDATE
    ↓
check_task_delay() trigger fires
    ↓
Detects: status → 'delayed'
    ↓
Query: projects.owner_id → email, assigned_advisor_id → company_name
    ↓
INSERT INTO notification_queue {
  notification_type: 'task_delay',
  recipient_email: entrepreneur@example.com,
  body_html: rendered TaskDelayEmail component,
  template_data: {taskId, taskName, plannedEndDate, advisorName},
  priority: 2,
  scheduled_for: NOW()
}
    ↓
INSERT INTO activity_log {
  event_type: 'task_delayed',
  entity_type: 'task'
}
    ↓
[process-notification-queue edge function runs periodically]
    ↓
Batch fetch pending notifications (priority ordered)
    ↓
Send via Resend email service
    ↓
Update notification_queue status → 'sent'
```

### Testing Checklist

1. **Unit Testing:**
   - Verify trigger only fires once per status transition
   - Confirm notification_queue rows are inserted with correct data
   - Verify NULL handling for missing advisors
   - Check activity_log insertion

2. **Integration Testing:**
   - Create task with planned_end_date = today - 1 day
   - Update task status (e.g., from 'pending' → 'in_progress')
   - Verify task.status is auto-set to 'delayed' by trigger
   - Check notification_queue has pending row
   - Verify entrepreneur receives email with correct task name, deadline, advisor
   - Test on mobile email clients (Hebrew RTL support)

3. **Edge Cases:**
   - Task without assigned advisor → use placeholder text
   - Task updated multiple times in quick succession → only one notification
   - Notification retry → verify exponential backoff
   - Email delivery failure → verify marked as 'failed', can be retried

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/_shared/email-templates/task-delay-notification.tsx` | Create | Email template for task delays |
| `supabase/migrations/[timestamp]_task_delay_notifications.sql` | Create | Enhanced trigger + activity logging |
| No frontend changes needed | — | Existing notification_queue processor handles delivery |

### Dependencies

- ✅ `notification_queue` table exists
- ✅ `activity_log` table exists  
- ✅ `process-notification-queue` edge function exists and is deployed
- ✅ `@react-email` library available for email template
- Requires: Profile email addresses must be available via `profiles.user_id`

### Success Metrics

- Task delays trigger notifications within seconds of status change
- 95%+ email delivery rate (via Resend)
- Entrepreneurs can click through to task detail in dashboard
- Activity log shows clear audit trail of delay detection
- No duplicate notifications per status change




# Phase 2.2 -- Accounts Payable List: Validation Report

## Implementation Coverage: ~80%

The system has a strong foundation with most core features built. Below is a detailed requirement-by-requirement analysis.

---

## Requirement-by-Requirement Status

### 1. Completed Task Identification + Consultant Notification
**Status: BUILT (90%)**

- Database trigger `trg_auto_unlock_milestone` automatically detects when all `is_payment_critical` tasks reach "completed" or "cancelled" status and sets the linked payment milestone to `due`.
- The `PaymentDashboard` displays a green alert banner when milestones become `due` ("There are completed milestones -- you can submit an invoice").
- The `AdvisorPaymentsView` shows only `due` milestones in the "New Request" dropdown, so consultants know exactly what they can invoice.
- **Gap**: No push/email notification is sent to the consultant when a milestone unlocks. Currently it's a passive UI indicator only.

### 2. Invoice Submission by Consultant
**Status: BUILT (85%)**

- `AdvisorPaymentsView` provides a "New Payment Request" button locked to `consultant` category and the advisor's own `project_advisor_id`.
- `CreatePaymentRequestDialog` in `advisorMode` filters milestones to `due` only, pre-fills amounts from milestones, and validates critical task completion before allowing submission.
- **Gap**: No explicit UI warning to the entrepreneur if the consultant changes the amount vs. the milestone amount. The amount field is editable but no diff/alert is generated on submission.

### 3. Entrepreneur "Professional" Approval with Signature
**Status: BUILT (100%)**

- Multi-step approval chain driven by `payment_status_definitions` table (e.g., prepared -> submitted -> professionally_approved -> budget_approved -> awaiting_payment -> paid).
- `ApprovePaymentDialog` dynamically renders signature requirement (drawn or checkbox) based on the current chain step.
- `PaymentRequestCard` shows dynamic "advance" buttons with the next step name (e.g., "Professional Approval").
- `ApprovalProgressStepper` provides visual step tracking.
- Full audit trail: `approved_at`, `approved_by`, `approver_signature_id` stored per transition.

### 4. Transfer to Accountant with Full Details
**Status: BUILT (85%)**

- `AccountantDashboard` (`/accountant`) automatically shows all non-draft requests across all projects.
- Displays: Amount, Status, Project, Consultant, Milestone, Submission Date.
- `PaymentStatusBadge` tracks each status ("Received by Accountant" = approval chain step).
- **Gap**: No automatic milestone description is attached to the accountant view. The milestone `name` is shown but the `description` field is not displayed in the accountant's table.
- **Gap**: No dedicated notification to the consultant on each status change (e.g., "received by accountant"). The status updates silently in the DB with a console.log placeholder.

### 5. Accountant Date Scheduling Page
**Status: BUILT (90%)**

- `LiabilitiesTab` in `AccountantDashboard` provides a centralized table of all open invoices.
- Columns present: Project, Consultant, Milestone, Status, Amount, Submission Date, Expected Payment (inline date picker), Actions.
- Inline `expected_payment_date` editing is working via `updateExpectedDate`.
- Open/Closed toggle to archive paid invoices.
- **Gap**: No "Company Name" column for multi-entity groups.
- **Gap**: No "set one date for all" bulk action.
- **Gap**: No contract violation warning when the expected date exceeds contractual terms.

### 6. "Paid" Column and Tax Invoice Trigger
**Status: BUILT (80%)**

- "Mark as Paid" button exists in both `AccountantDashboard` and `PaymentDashboard`.
- When paid, `AdvisorPaymentsView` shows a yellow "Tax Invoice Required" alert with acknowledge button.
- **Gap**: The "Paid" trigger is a button, not an editable date column. The `paid_at` timestamp is set automatically to `now()` rather than allowing a custom payment date.
- **Gap**: No email/push notification is sent to the consultant when marked as paid. Only a passive UI alert on next visit.

### 7. Consultant "Invoices" Tab on Dashboard
**Status: BUILT (70%)**

- `AdvisorPaymentsView` shows all requests across projects in a table.
- Columns present: Project, Milestone, Amount, Status, Date.
- Open/Closed toggle for filtering.
- Tax Invoice alerts for paid requests.
- **Missing columns**: Investor Name, Specialty/Area, Invoice Number, Percentage of Total Received (cumulative %), Investor Approval (checkmark), Transferred to Accountant (checkmark), Expected Payment per Contract, Estimated Payment per Accountant Update.
- **Missing**: Ability to contact the investor about specific invoices (messaging/communication feature).
- **Missing**: Ability to view the submitted invoice document inline.

### 8. Follow-up Message to Accountant (Day After Due Date)
**Status: NOT BUILT**

- No cron job or edge function exists for payment due date reminders.
- The `deadline-reminder` and `rfp-reminder-scheduler` edge functions handle RFP deadlines only, not payment deadlines.

### 9. Payment Confirmation + Tax Invoice Reminder to Consultant
**Status: PARTIALLY BUILT (40%)**

- The `AdvisorPaymentsView` shows a passive "Tax Invoice Required" alert.
- **Missing**: No automated email notification with the specific message format ("Investor X claims invoice #Y for project Z was paid on date D -- please issue a tax invoice").
- **Missing**: No mechanism for the consultant to send the tax invoice back to the accountant through the system.

### 10. Approaching Payment Deadline Alerts
**Status: NOT BUILT**

- No proactive alerts for approaching payment deadlines or cash flow deviations.
- The `CashFlowChart` visualizes projections but does not trigger warnings.

### 11. Automatic Budget Report Sync
**Status: BUILT (90%)**

- `PaymentSummaryCards` shows real-time budget vs. paid vs. pending vs. remaining.
- Progress bar shows paid percentage of total budget.
- Calculations use live data from `payment_requests` table.
- **Gap**: No formal exportable "budget report" document.

### 12. Cash Flow Forecast Generation
**Status: BUILT (85%)**

- `CashFlowChart` (project-level): Cumulative projected vs. actual area chart using milestone `due_date` and request `paid_at`.
- `GlobalCashFlowTab` (accountant-level): 6-month bar chart using `expected_payment_date` with fallback to milestone `due_date`.
- Task-to-milestone date sync ensures forecasts update as schedules shift.
- **Gap**: Does not estimate task duration to predict payment timing for unscheduled milestones.

---

## Summary: What Needs to Be Built

| Priority | Gap | Effort |
|----------|-----|--------|
| High | Email notifications on status changes (milestone unlocked, paid, approaching deadline) | New edge function + cron |
| High | Enriched consultant invoices tab (missing 8 columns, cumulative %, checkmarks) | UI enhancement |
| Medium | "Day after due date" follow-up to accountant | New cron edge function |
| Medium | Bulk date setting for accountant | Small UI feature |
| Medium | Contract violation warning on date changes | Logic + UI |
| Medium | Consultant-to-investor messaging per invoice | New feature |
| Low | Company name column for multi-entity groups | Small UI addition |
| Low | Custom paid_at date input (vs auto-now) | Small UI change |
| Low | Exportable budget report | PDF generation |
| Low | Tax invoice upload/send back to accountant | File upload flow |

## Percentage Breakdown

- **Requirements 1-6 (Core Flow)**: ~85% complete
- **Requirement 7 (Consultant Tab)**: ~70% complete
- **Requirements 8-10 (Notifications/Alerts)**: ~15% complete
- **Requirements 11-12 (Reports/Forecast)**: ~87% complete
- **Overall**: ~80% complete

The core transactional workflow (submit -> approve -> transfer -> pay) is fully functional. The main gaps are in **proactive notifications** (email/push for status changes and deadline reminders) and **consultant dashboard enrichment** (additional columns and communication features).


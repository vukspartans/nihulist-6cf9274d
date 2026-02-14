

# Chunk 3: Consultant Invoice Portal -- Implementation Plan

## Overview

Add a "Payments" tab to the Advisor Dashboard, allowing consultants to view their payment requests, submit new invoices for eligible milestones, and respond to "Tax Invoice Required" prompts after payment.

---

## New File: `src/components/payments/AdvisorPaymentsView.tsx`

A self-contained component that:

1. **Fetches data** for the current advisor:
   - Queries `advisors` to get the advisor record for `auth.uid()`
   - Queries `project_advisors` to get all `project_advisor` IDs for this advisor
   - Queries `payment_requests` filtered by those `project_advisor_id` values, joining `payment_milestone` (name) and project (name via `project_id`)
   - Queries `payment_milestones` with `status = 'due'` for the same project_advisor IDs (for the submission dropdown)

2. **Renders a payment requests table** with columns:
   - Project Name (from joined project data)
   - Milestone Name
   - Amount (total_amount)
   - Status (using `PaymentStatusBadge`)
   - Submission Date (submitted_at or created_at)

3. **Filter toggle**: "Open" (non-terminal statuses) vs "Paid/Closed" (paid + rejected)

4. **"Tax Invoice Required" alert**: For requests with `status === 'paid'`, show a prominent alert card with an action button. Clicking marks it as acknowledged (local state toggle per request ID, stored in a Set). This avoids a DB migration for now.

5. **"New Payment Request" button** that opens `CreatePaymentRequestDialog` in **advisor-locked mode** (new props below).

---

## Edit: `src/components/payments/CreatePaymentRequestDialog.tsx`

Add two new optional props to support advisor-locked mode:

```typescript
interface CreatePaymentRequestDialogProps {
  // ... existing props
  lockedAdvisorId?: string;        // Lock the consultant dropdown to this project_advisor_id
  advisorMode?: boolean;           // When true: hide category selector, lock to 'consultant', only show 'due' milestones
}
```

**Changes when `advisorMode === true`:**
- Category is forced to `'consultant'` (hide the category selector)
- The "Consultant" dropdown is disabled and pre-filled with `lockedAdvisorId`
- The milestone dropdown filters to only show milestones with `status === 'due'` (instead of all non-paid)
- This enforces the Chunk 1 rule: only milestones unlocked by task completion are available

---

## Edit: `src/pages/AdvisorDashboard.tsx`

Minimal changes:

1. Add `'payments'` to the `activeTab` union type (line 144):
   ```typescript
   const [activeTab, setActiveTab] = useState<'rfp-invites' | 'my-proposals' | 'negotiations' | 'tasks' | 'payments'>('rfp-invites');
   ```

2. Expand the TabsList from `grid-cols-4` to `grid-cols-5` (line 1013)

3. Add a new `TabsTrigger` for payments with a Wallet icon:
   ```tsx
   <TabsTrigger value="payments" className="flex items-center gap-2">
     <Wallet className="h-4 w-4" />
     תשלומים
   </TabsTrigger>
   ```

4. Add the `TabsContent`:
   ```tsx
   <TabsContent value="payments">
     <AdvisorPaymentsView />
   </TabsContent>
   ```

The `AdvisorPaymentsView` component is fully self-contained -- it fetches its own data using the current user's auth context, so no additional props are needed from the dashboard.

---

## Data Flow

```text
AdvisorPaymentsView
  |
  |-- useAuth() -> user.id
  |-- Query: advisors WHERE user_id = auth.uid() -> advisor.id
  |-- Query: project_advisors WHERE advisor_id = advisor.id -> [project_advisor_ids]
  |-- Query: payment_requests WHERE project_advisor_id IN [...] -> requests list
  |-- Query: payment_milestones WHERE project_advisor_id IN [...] AND status = 'due' -> eligible milestones
  |
  |-- Renders: Table of requests with PaymentStatusBadge
  |-- Renders: "Tax Invoice Required" alerts for paid requests
  |-- Opens: CreatePaymentRequestDialog(advisorMode=true, lockedAdvisorId=pa.id)
```

---

## Milestone Eligibility Enforcement

The milestone dropdown in advisor mode only shows `status === 'due'` milestones. Combined with the Chunk 1 DB trigger (`auto_unlock_payment_milestone`), this means:

1. Consultant completes critical tasks
2. DB trigger sets milestone to `due`
3. Milestone appears in consultant's "Submit Invoice" dropdown
4. Consultant submits payment request
5. Request enters the multi-step approval chain (Chunk 2)

---

## Tax Invoice Prompt (Lightweight)

When a payment request reaches `status === 'paid'`:
- A yellow alert card appears at the top of the advisor's payment list
- Text: "נדרש: הנפקת חשבונית מס"
- Description: "התשלום עבור [milestone name] אושר. נא להנפיק חשבונית מס ולהעלותה."
- Action button: "סימון כהונפק" -- toggles local state (no DB change needed now; a `tax_invoice_issued` column can be added later)

---

## Files Summary

| File | Action | Description |
|---|---|---|
| `src/components/payments/AdvisorPaymentsView.tsx` | NEW | Full advisor payments view with table, filters, alerts |
| `src/components/payments/CreatePaymentRequestDialog.tsx` | EDIT | Add `advisorMode` and `lockedAdvisorId` props |
| `src/pages/AdvisorDashboard.tsx` | EDIT | Add 5th tab "Payments" pointing to AdvisorPaymentsView |
| `src/components/payments/index.ts` | EDIT | Export AdvisorPaymentsView |

## No DB Migration Required

All queries use existing tables and RLS policies. Advisors already have SELECT + INSERT permissions on `payment_requests` and SELECT on `payment_milestones` for their `project_advisor_id`.


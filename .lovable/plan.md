

# Chunk 4: Accountant Dashboard (Financial Control Center) -- Implementation Plan

## Overview

Create a centralized financial control center at `/accountant` accessible to entrepreneurs, providing a cross-project view of all liabilities, vendor concentration, and cash flow forecasting.

---

## Database Migration: Add `expected_payment_date`

A single column addition to `payment_requests`:

```sql
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS expected_payment_date date;
```

No RLS changes needed -- existing policies on `payment_requests` already cover entrepreneur read/write access.

---

## New File: `src/pages/AccountantDashboard.tsx`

A top-level page with 3 tabs:

### Tab 1: Liabilities List (התחייבויות)

- Fetches ALL `payment_requests` for projects owned by the current user, joined with:
  - `projects` (name)
  - `project_advisors` -> `advisors` (company_name)
  - `payment_milestones` (name)
- Filters out `prepared` status (draft, not yet submitted)
- Renders a `Table` with columns: Project, Consultant, Milestone, Status (PaymentStatusBadge), Amount, Submitted Date, Expected Payment Date
- The "Expected Payment Date" column contains an inline date picker (`Input type="date"`) that updates `payment_requests.expected_payment_date` via a direct Supabase update
- Action buttons per row: View (opens PaymentRequestDetailDialog), Approve (if applicable), Mark Paid (if `awaiting_payment`)
- Uses `useApprovalChain` for dynamic status transitions

### Tab 2: Consultant Concentration (ריכוז ספקים)

- Groups all payment requests by `project_advisor_id` -> advisor
- For each advisor, computes:
  - Total Paid (YTD): sum of `total_amount` where `status === 'paid'` and `paid_at` is in current year
  - Total Outstanding: sum of `total_amount` where status is non-terminal and not `prepared`
- Renders a summary table with expandable rows (Collapsible) showing individual invoices per consultant
- Sorted by Total Outstanding descending

### Tab 3: Global Cash Flow (תזרים גלובלי)

- Aggregates data across ALL projects
- Reuses the `CashFlowChart` rendering logic but with global data
- Uses `expected_payment_date` if set, otherwise falls back to milestone `due_date`
- Additionally renders a simple `BarChart` showing projected monthly outflows for the next 6 months

---

## New File: `src/hooks/useAccountantData.ts`

A dedicated hook that fetches all financial data across projects for the current entrepreneur:

```typescript
export function useAccountantData() {
  // 1. Fetch all projects owned by current user
  // 2. Fetch all payment_requests for those projects with joins
  // 3. Fetch all payment_milestones for those projects
  // 4. Compute vendor summaries
  // 5. Expose: allRequests, allMilestones, vendorSummaries, loading, updateExpectedDate()
}
```

Key queries:
- `projects` WHERE `owner_id = auth.uid()` -> get project IDs
- `payment_requests` WHERE `project_id IN (...)` with joins to `project_advisors.advisors`, `payment_milestones`, and `projects`
- `payment_milestones` WHERE `project_id IN (...)`

The `updateExpectedDate(requestId, date)` function performs a direct Supabase update on `payment_requests.expected_payment_date`.

---

## Routing: `src/App.tsx`

Add a new route for entrepreneurs:

```tsx
<Route
  path="/accountant"
  element={
    <ProtectedRoute>
      <RoleBasedRoute allowedRoles={['entrepreneur']}>
        <AccountantDashboard />
      </RoleBasedRoute>
    </ProtectedRoute>
  }
/>
```

No new role needed -- the entrepreneur (organization owner) accesses this dashboard.

---

## Navigation: Link from Entrepreneur Dashboard

Add a link/button in the existing `Dashboard.tsx` (entrepreneur main page) to navigate to `/accountant`. A small card or button labeled "מרכז פיננסי" with a `Building2` or `Calculator` icon.

---

## Mark as Paid Workflow

The liabilities table includes action buttons that reuse the same `useApprovalChain` + `updatePaymentRequestStatus` logic from Chunk 2. When a request is at `awaiting_payment`, the "Mark Paid" button is shown. Clicking it:

1. Sets status to `paid` via `updatePaymentRequestStatus`
2. Sets `paid_at` timestamp (already handled)
3. The consultant's `AdvisorPaymentsView` (Chunk 3) automatically shows the "Tax Invoice Required" alert

This closes the loop between Chunks 2, 3, and 4.

---

## Type Update: `src/types/payment.ts`

Add `expected_payment_date` to the `PaymentRequest` interface:

```typescript
expected_payment_date: string | null;
```

---

## Files Summary

| File | Action | Description |
|---|---|---|
| `supabase/migrations/[timestamp].sql` | NEW | Add `expected_payment_date` column |
| `src/types/payment.ts` | EDIT | Add `expected_payment_date` field |
| `src/hooks/useAccountantData.ts` | NEW | Cross-project financial data hook |
| `src/pages/AccountantDashboard.tsx` | NEW | 3-tab financial control center |
| `src/App.tsx` | EDIT | Add `/accountant` route |
| `src/pages/Dashboard.tsx` | EDIT | Add navigation link to accountant dashboard |
| `src/components/payments/index.ts` | EDIT | Export any new shared components |

## Technical Notes

- All queries use existing RLS policies (entrepreneur can see their own project data)
- The `expected_payment_date` inline editor uses a debounced Supabase update
- The global cash flow chart reuses recharts (already installed) with a BarChart for monthly projections
- RTL layout with `dir="rtl"` on all containers per project standards
- No emojis in financial UI per copy guidelines


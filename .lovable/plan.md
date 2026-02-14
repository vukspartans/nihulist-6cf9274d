

# Fix: Add Approval Action Buttons to Accountant Dashboard

## Problem
The Accountant Dashboard's Liabilities tab only shows a "Mark as Paid" button for requests at the final `awaiting_payment` stage. Requests at intermediate statuses like `professionally_approved` or `budget_approved` show no action buttons, so the accountant cannot advance them through the approval chain.

## Solution
Add a generic "Advance" button that appears for any request that has a valid next step in the approval chain. The button label will dynamically show the next status name (e.g., "אשר תקציבית" for budget approval).

## Changes

### File: `src/pages/AccountantDashboard.tsx` (LiabilitiesTab component)

Update the Actions column logic in the table:

**Current behavior:**
- Only shows "שולם" button when next step is `paid` or status is `awaiting_payment`

**New behavior:**
- If next step is `paid` (or status is `awaiting_payment`): show the existing "Mark as Paid" flow with date input
- Otherwise, if there IS a next step: show an "Advance" button labeled with the next status name (e.g., "אשר תקציבית")
- The advance button calls `updateRequestStatus(req.id, next.code)`

### Technical Detail

In the `LiabilitiesTab` component, replace the `canMarkPaid`-only logic in the Actions cell with:

```
if canMarkPaid -> show paid date input + "שולם" button (existing)
else if next step exists -> show "advance" button with next.name as label
```

The `updateRequestStatus` function from `useAccountantData` already supports advancing to any status, so no hook changes are needed.

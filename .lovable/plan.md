

# Fix: The "Prepared" Trap + Golden Path Verification

## Part 1: The Critical Fix

### Problem
When a consultant creates a payment request in `AdvisorPaymentsView`, it starts as `prepared` (draft). There is no "Submit" button anywhere in the consultant UI to transition it to `submitted`. The entrepreneur's `PaymentRequestCard` explicitly skips actions for `prepared` status. Result: invoices are permanently stuck in draft.

### Solution
Add a "Submit Request" action column to the consultant's table in `AdvisorPaymentsView.tsx`. For rows where `status === 'prepared'`, show two buttons:
- **"הגש בקשה" (Submit Request)** -- transitions status to `submitted` via the existing `updatePaymentRequestStatus` logic.
- **"מחק" (Delete)** -- deletes the draft (already partially supported but not wired in the table view).

### File: `src/components/payments/AdvisorPaymentsView.tsx`

**Changes:**
1. Add an "Actions" column (`<TableHead>`) to the table header.
2. In each table row, render action buttons based on status:
   - `prepared`: Show "Submit" button (blue, with `Send` icon) and "Delete" button (red trash icon).
   - All other non-terminal statuses: No actions (consultant waits for approval chain).
   - `paid`: No action (handled by the Tax Invoice alert banner above).
3. The "Submit" handler calls `supabase.from('payment_requests').update({ status: 'submitted', submitted_at: now, submitted_by: user.id })` and triggers the `notify-payment-status` edge function with type `status_changed`.
4. The "Delete" handler calls `supabase.from('payment_requests').delete()` with a confirmation dialog.
5. After either action, re-fetch the requests list.

### No other files need changes
- `useProjectPayments.ts` already handles `submitted` status transitions correctly (line 244-245 sets `submitted_at`).
- `PaymentRequestCard` does not need changes -- it is only used in the Entrepreneur view.
- The approval chain (`payment_status_definitions`) already has `submitted` as step 2 with `display_order: 2`.

---

## Part 2: Golden Path Verification Results

| Step | Description | Result |
|------|-------------|--------|
| 1 | Task marked DONE triggers milestone to `due` | PASS -- `trg_auto_unlock_milestone` fires on `project_tasks.status` update, checks all `is_payment_critical` tasks, sets milestone `due` |
| 2 | Consultant creates + submits invoice | FAIL (pre-fix) -- Creation works, dropdown filters `due` milestones correctly, but no Submit button exists to move from `prepared` to `submitted` |
| 3 | Entrepreneur approves through chain | PASS -- `getNextStep('submitted')` returns `professionally_approved`, then `budget_approved`, then `awaiting_payment`. Never jumps to `paid` |
| 4 | Accountant schedules + marks paid | PASS -- `AccountantDashboard` shows approved requests, inline date editing works, "Mark as Paid" sets status to `paid` with `paid_at` timestamp |
| 5 | Consultant sees Tax Invoice alert | PASS -- `paidRequests` filter (status=paid, not acknowledged) triggers amber alert banner with "Please issue Tax Invoice" message |

### Post-fix expected result: All 5 steps PASS.

---

## Technical Details

### Exact changes in `AdvisorPaymentsView.tsx`

**Add to imports:** `Send, Trash2` from lucide-react (Trash2 already imported indirectly but not used in table).

**Add handler functions:**
```typescript
const handleSubmitRequest = async (requestId: string) => {
  const { error } = await supabase
    .from('payment_requests')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: user?.id,
    })
    .eq('id', requestId);

  if (error) { /* show error toast */ return; }

  // Trigger notification
  try {
    await supabase.functions.invoke('notify-payment-status', {
      body: { type: 'status_changed', payment_request_id: requestId },
    });
  } catch {}

  toast({ title: 'הבקשה הוגשה', description: 'בקשת התשלום נשלחה לאישור.' });
  // Re-fetch data
};

const handleDeleteRequest = async (requestId: string) => {
  if (!confirm('האם למחוק את בקשת התשלום?')) return;
  await supabase.from('payment_requests').delete().eq('id', requestId);
  // Re-fetch data
};
```

**Add table column:** One new `<TableHead>` for "פעולות" (Actions) and corresponding `<TableCell>` with conditional buttons:
- `status === 'prepared'`: Submit button + Delete button
- Otherwise: em-dash or empty


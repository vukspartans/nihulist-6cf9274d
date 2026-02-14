

# Chunk 2: Multi-Step Approval Chain -- Implementation Plan

## Current State

The DB has 7 `payment_status_definitions` ordered as a pipeline:

```text
prepared -> submitted -> professionally_approved -> budget_approved -> awaiting_payment -> paid
                                                                                         (rejected = terminal branch)
```

Two statuses require signatures: `professionally_approved` (checkbox) and `budget_approved` (drawn signature).

However, the current code:
- `PaymentDashboard.handleApproveSubmit` hardcodes transition to `'approved'` (a status code that does NOT exist in the DB)
- `PaymentRequestCard` only shows Approve/Reject buttons for `status === 'submitted'` and Mark Paid for `status === 'approved'`
- `handleMarkPaid` hardcodes transition to `'paid'`
- The `organization_approval_chains` table is empty -- the status definitions table itself IS the chain

---

## Architecture Decision

Use `payment_status_definitions` (ordered by `display_order`) as the canonical approval chain. The `organization_approval_chains` table exists for future per-organization customization, but the system statuses are the baseline. This avoids requiring every organization to populate chains before the workflow works.

---

## Fix 1: Create `useApprovalChain` Hook

**File:** `src/hooks/useApprovalChain.ts` (new)

**Purpose:** Given the current status of a payment request, determine:
- The next status in the chain
- Whether the current step requires a signature (and what type)
- The Hebrew label for the action button
- Whether the current status is actionable by the current user

**Logic:**
1. Fetch all active `payment_status_definitions` ordered by `display_order`
2. Find the current status's position in the chain
3. Return the next non-terminal status as `nextStatus`
4. If `nextStatus.requires_signature` is true, the `ApprovePaymentDialog` will enforce signature collection matching `signature_type`
5. Expose a `getNextStep(currentStatusCode)` function returning `{ nextCode, nextName, requiresSignature, signatureType }`
6. Expose `isTerminal(statusCode)` helper

**Return shape:**
```typescript
{
  statuses: PaymentStatusDefinition[],       // full ordered chain
  getNextStep: (code: string) => NextStep | null,
  isTerminal: (code: string) => boolean,
  isLoading: boolean,
  currentStepIndex: (code: string) => number,
  totalSteps: number,
}
```

---

## Fix 2: Upgrade `updatePaymentRequestStatus` in `useProjectPayments`

**File:** `src/hooks/useProjectPayments.ts`

**Changes to `updatePaymentRequestStatus`:**
- No changes to the function signature (it already accepts any `status: string`)
- The caller (`PaymentDashboard`) will now pass the correct next status code instead of hardcoded `'approved'`

**Changes to `PaymentDashboard.handleApproveSubmit`:**
- Instead of `updatePaymentRequestStatus(request.id, 'approved', ...)`, it will:
  1. Call `getNextStep(request.status)` from the hook
  2. Pass the `nextCode` as the status (e.g., `'professionally_approved'` when current is `'submitted'`)
- For `handleMarkPaid`: only callable when status is `'awaiting_payment'`, transitions to `'paid'`
- For `handleReject`: callable from any non-terminal status, transitions to `'rejected'`

**File:** `src/components/payments/PaymentDashboard.tsx`

**Changes:**
- Import and use `useApprovalChain` hook
- Replace `handleApproveSubmit` to use dynamic next status
- Replace `handleMarkPaid` to only work from `awaiting_payment`
- Pass approval chain data down to `PaymentRequestCard` and `ApprovePaymentDialog`

---

## Fix 3: UI -- Dynamic Buttons in `PaymentRequestCard`

**File:** `src/components/payments/PaymentRequestCard.tsx`

**Current hardcoded logic:**
- `submitted` -> show Approve/Reject
- `approved` -> show Mark Paid
- `prepared` -> show Delete

**New dynamic logic:**
- Receive `approvalChain` data as a prop (or use the hook directly)
- For any non-terminal, non-final status: show "Advance" button with the next step's name (e.g., "אשר מקצועית", "אשר תקציבי", "העבר לתשלום")
- For `awaiting_payment`: show "סמן כשולם" (Mark Paid)
- For `prepared`: show Delete
- Always show Reject button for non-terminal statuses (except `prepared`)
- Add a small step indicator showing position in chain (e.g., "שלב 3/6")

**New props:**
```typescript
interface PaymentRequestCardProps {
  // ... existing
  nextStep: { code: string; name: string; requiresSignature: boolean } | null;
  currentStepIndex: number;
  totalSteps: number;
}
```

---

## Fix 4: Upgrade `ApprovePaymentDialog` for Dynamic Signatures

**File:** `src/components/payments/ApprovePaymentDialog.tsx`

**Changes:**
- Accept `nextStepName` and `requiresSignature` and `signatureType` as props
- Dialog title changes dynamically: "אישור מקצועי" / "אישור תקציבי" etc.
- If `requiresSignature` is true AND type is `'drawn'`, show SignatureCanvas (already there)
- If `requiresSignature` is true AND type is `'checkbox'`, show a checkbox instead of the canvas
- If `requiresSignature` is false, hide the signature section entirely
- The confirmation alert text updates to describe the next step: "לאחר האישור, הבקשה תועבר ל[nextStepName]"

---

## Fix 5: Approval Progress Stepper

**File:** `src/components/payments/ApprovalProgressStepper.tsx` (new)

A small inline component showing the approval chain progress. Rendered inside `PaymentRequestCard` below the status badge.

**Visual:** Small circles/dots connected by lines, colored based on completion:
- Completed steps: filled with the status color
- Current step: outlined with a pulse
- Future steps: gray outline

RTL layout (right-to-left flow matching Hebrew).

---

## Fix 6: Notification Stub

**File:** `src/hooks/useProjectPayments.ts`

In `updatePaymentRequestStatus`, after the successful status update, add:
```typescript
// Notification stub - will be replaced with edge function
console.log(`[Approval Chain] Status changed to ${status}. Notification would be sent to next approver.`);
toast({ title: 'הבקשה הועברה', description: `סטטוס עודכן: הודעה תישלח לגורם המאשר הבא` });
```

---

## Summary of Files

| File | Action | Description |
|---|---|---|
| `src/hooks/useApprovalChain.ts` | NEW | Hook to read chain, compute next step, check signatures |
| `src/hooks/useProjectPayments.ts` | EDIT | Add notification stub in `updatePaymentRequestStatus` |
| `src/components/payments/PaymentDashboard.tsx` | EDIT | Use hook, pass dynamic status to approve/mark-paid |
| `src/components/payments/PaymentRequestCard.tsx` | EDIT | Dynamic buttons based on chain position |
| `src/components/payments/ApprovePaymentDialog.tsx` | EDIT | Dynamic title, conditional signature by type |
| `src/components/payments/ApprovalProgressStepper.tsx` | NEW | Visual step indicator |
| `src/components/payments/PaymentRequestsTable.tsx` | EDIT | Pass chain data to cards |
| `src/types/payment.ts` | EDIT | Update status type to include new codes |

## No DB Migration Required

All status definitions already exist in the database. The logic change is purely in the frontend -- reading and respecting the existing `payment_status_definitions` instead of ignoring them.


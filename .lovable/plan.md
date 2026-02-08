

# Bug Analysis & Action Plan: Email Notifications and Approval Dialog Issues

## Summary of Reported Bugs

| Bug | Description | Root Cause Found |
|-----|-------------|------------------|
| **Bug 1** | Entrepreneurs not receiving emails about received proposals | `test_mode: true` hardcoded - emails go to test address |
| **Bug 2** | Approval dialog not closing / status not updating | `ProposalComparisonDialog` not calling parent's `onStatusChange` |

---

## Bug 1: Entrepreneurs Not Receiving Email Updates About Proposals

### Root Cause: **CRITICAL - test_mode is hardcoded to `true`**

**Location**: `src/hooks/useProposalSubmit.ts` lines 451-457

```typescript
supabase.functions
  .invoke('notify-proposal-submitted', {
    body: {
      proposal_id: proposal.id,
      test_mode: true,  // ← BUG: Always sends to test email!
    },
  })
```

When `test_mode: true`, the edge function sends emails to a hardcoded test address (`lior+billding@spartans.tech`) instead of the actual entrepreneur.

**Edge Function Logic** (from `notify-proposal-submitted/index.ts` lines 113-118):
```typescript
const recipientEmail = test_mode 
  ? 'lior+billding@spartans.tech'  // ← Test address
  : entrepreneurProfile.email;      // ← Real entrepreneur email
```

### Fix Required

Change `test_mode: true` to `test_mode: false` in `useProposalSubmit.ts` line 455.

### Same Issue in Other Places

Also found in `useProposalApproval.ts` line 189 for rejected proposal notifications:
```typescript
test_mode: true, // Set to false in production
```

---

## Bug 2: Approval Dialog Not Closing / Status Not Updating

### Root Cause: Missing `onStatusChange` callback propagation

**Issue 1: ProposalComparisonDialog doesn't pass `onStatusChange`**

When the comparison dialog is opened from `ProjectDetail.tsx`, the `onStatusChange` prop is passed, but when `ProposalApprovalDialog` completes, only `fetchProposals()` is called - not the parent's `onStatusChange`.

**Current Code** (`ProposalComparisonDialog.tsx` lines 1188-1192):
```typescript
onSuccess={() => {
  setApprovalDialogOpen(false);
  setSelectedProposal(null);
  fetchProposals();  // ← Only refetches internal data
  // Missing: onStatusChange?.(); to notify parent
}}
```

**Working Code** (`ProposalDetailDialog.tsx` line 1200):
```typescript
onSuccess={()=>{ onStatusChange?.(); onSuccess?.(); onOpenChange(false); }}
// ↑ Correctly chains all callbacks
```

**Issue 2: Parent dialog may not update**

Even with `fetchProposals()`, the parent components that render `ProposalComparisonDialog` may not be aware of the status change because:
1. React Query invalidation happens in the hook, but the comparison dialog uses local state (`proposals`)
2. The comparison dialog's internal `fetchProposals()` may not trigger a re-render in `ProjectDetail.tsx`

### Fix Required

1. Update `ProposalComparisonDialog`'s `onSuccess` handler to call parent's `onStatusChange`:

```typescript
onSuccess={() => {
  setApprovalDialogOpen(false);
  setSelectedProposal(null);
  fetchProposals();
  onStatusChange?.();  // ← Add this line
}}
```

2. Verify that `ProposalComparisonDialog` receives and uses `onStatusChange` prop from parent.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useProposalSubmit.ts` | Change `test_mode: true` to `false` (line 455) |
| `src/hooks/useProposalApproval.ts` | Change `test_mode: true` to `false` (line 189) |
| `src/components/ProposalComparisonDialog.tsx` | Add `onStatusChange?.()` to onSuccess callback |

---

## Technical Details

### Change 1: Fix test_mode in useProposalSubmit.ts

**Line 455**: Change from:
```typescript
test_mode: true,
```
To:
```typescript
test_mode: false,
```

### Change 2: Fix test_mode in useProposalApproval.ts

**Line 189**: Change from:
```typescript
test_mode: true, // Set to false in production
```
To:
```typescript
test_mode: false,
```

### Change 3: Add onStatusChange to ProposalComparisonDialog

**Lines 1188-1192**: Change from:
```typescript
onSuccess={() => {
  setApprovalDialogOpen(false);
  setSelectedProposal(null);
  fetchProposals();
}}
```
To:
```typescript
onSuccess={() => {
  setApprovalDialogOpen(false);
  setSelectedProposal(null);
  fetchProposals();
  onStatusChange?.();  // Notify parent of status change
}}
```

---

## Testing Checklist

After implementation:

1. **Email Notifications**
   - Submit a proposal as advisor
   - Verify entrepreneur receives email at their actual email address (not test address)
   - Check edge function logs for successful delivery

2. **Approval Dialog Flow**
   - Open project detail page
   - Click on "Compare Proposals" button
   - Select a proposal and click "Approve"
   - Complete approval with signature
   - Verify approval dialog closes
   - Verify comparison dialog shows updated status immediately
   - Verify project detail page shows "Approved" status

3. **Rejection Email**
   - Reject a proposal from comparison dialog
   - Verify advisor receives rejection email at their actual email address


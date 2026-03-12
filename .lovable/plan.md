

# Fix: Proposal Rejection Flow — Multiple Issues

## Investigation Summary

I audited all three rejection paths in the codebase. There is no literal `is_rejected: true` boolean-to-enum mismatch, but there are **three distinct bugs** across the rejection flows that cause failures and data inconsistency.

## Bugs Found

### Bug 1: `ProposalDetailDialog.handleReject` — Wrong notification payload field names (line 474)

```typescript
// CURRENT (broken):
await supabase.functions.invoke('notify-proposal-rejected', { 
  body: { proposalId: proposal.id, reason } 
});

// The edge function expects:
//   proposal_id  (not proposalId)
//   rejection_reason  (not reason)
```

The notification function receives `proposal_id: undefined`, fails to find the proposal, and errors. Additionally, this handler does a raw `.update({ status: 'rejected' })` without calling `reject_proposal_with_cleanup`, so **active negotiations are never cancelled**.

### Bug 2: `useProposalApproval.rejectProposal` — Skips negotiation cleanup

This hook does a direct `proposals.update()` instead of calling the `reject_proposal_with_cleanup` RPC. Active negotiation sessions remain in `open`/`awaiting_response` state, and `has_active_negotiation` stays `true`.

### Bug 3: Inconsistent rejection paths

Three different functions reject proposals using three different mechanisms:
1. `ProposalDetailDialog.handleReject` → direct `.update()` + broken notification
2. `useProposalApproval.rejectProposal` → direct `.update()` + correct notification but no cleanup  
3. `useNegotiation.rejectProposal` → edge function `reject-proposal` → RPC with cleanup ✓

Only path 3 is correct.

## Fix

**Consolidate all rejection to use the `reject-proposal` edge function**, which properly:
- Validates ownership
- Updates status via `reject_proposal_with_cleanup` RPC
- Cancels active negotiations
- Sets `has_active_negotiation = false`
- Sends email notifications

### File 1: `src/components/ProposalDetailDialog.tsx` (line 470-477)

Replace the inline `handleReject` with a call to `useNegotiation().rejectProposal`:

- Import `useNegotiation` hook
- Replace the inline try/catch with:
  ```typescript
  const handleReject = async () => {
    const reason = prompt("נא להזין סיבת דחייה:");
    if (!reason) return;
    const success = await rejectWithNotification(proposal.id, reason);
    if (success) {
      onStatusChange?.();
      onSuccess?.();
      onOpenChange(false);
    }
  };
  ```
- Add query invalidation after success

### File 2: `src/hooks/useProposalApproval.ts` (lines 185-256)

Replace the direct `.update()` + separate notification call with a single edge function invocation:

```typescript
const rejectProposal = async (proposalId: string, projectId: string, reason?: string) => {
  setLoading(true);
  try {
    const { error } = await supabase.functions.invoke('reject-proposal', {
      body: { proposal_id: proposalId, rejection_reason: reason },
    });
    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['proposals', projectId] });
    toast({ title: 'הצעה נדחתה', description: 'היועץ יקבל הודעה על כך' });
    return { success: true };
  } catch (error: any) {
    handleError(error, { action: 'reject_proposal', metadata: { proposalId, projectId } });
    return { success: false };
  } finally {
    setLoading(false);
  }
};
```

This removes ~40 lines of duplicated logic (direct update, activity log insert, separate notification call) and replaces with 15 lines using the edge function that already handles all of it.

## Files Modified: 2
- `src/components/ProposalDetailDialog.tsx` — use `useNegotiation` hook for rejection
- `src/hooks/useProposalApproval.ts` — delegate to `reject-proposal` edge function




# Fix: Negotiation Button Not Available on First Load

## Root Cause Analysis

After thorough investigation of `ProposalDetailDialog.tsx`, I identified two bugs that can cause the negotiation button to not appear on initial load:

### Bug 1: `isViewingHistoricalVersion` false positive (line 124)
```typescript
const isViewingHistoricalVersion = viewVersion !== undefined && viewVersion !== proposal.current_version;
```
When a user opens a proposal via the NegotiationStepsTimeline (which passes a `viewVersion` like `1`), and `proposal.current_version` is `null` or `undefined` from the DB, this evaluates to `1 !== null` → `true`. This hides the entire action buttons section (line 684), including the negotiation button.

After clicking "Accept Offer" and navigating back, the dialog reopens without `viewVersion` (it's reset to `undefined` on close), so `isViewingHistoricalVersion = false` and buttons appear.

### Bug 2: Status gate excludes `negotiation_requested` (line 684)
```typescript
{(proposal.status === 'submitted' || proposal.status === 'resubmitted') && !isViewingHistoricalVersion && (
```
After a negotiation cycle, the proposal status becomes `negotiation_requested`. This status is NOT included in the gate, so all action buttons (including approve, reject, and negotiation) are hidden until the advisor responds and status changes back to `resubmitted`.

### Bug 3: `hasRespondedNegotiation` stale state risk
The state isn't explicitly reset when `open` or `proposal.id` changes — it carries over from the async effect of the previous proposal until the new async query completes.

## Fix — 1 file

### `src/components/ProposalDetailDialog.tsx`

**Change 1** — Fix `isViewingHistoricalVersion` (line 124):
```typescript
const isViewingHistoricalVersion = viewVersion !== undefined 
  && proposal.current_version != null 
  && viewVersion !== proposal.current_version;
```
If `current_version` is null/undefined, we treat the viewed version as current.

**Change 2** — Add `negotiation_requested` to the status gate (line 684):
```typescript
{(proposal.status === 'submitted' || proposal.status === 'resubmitted' || proposal.status === 'negotiation_requested') && !isViewingHistoricalVersion && (
```

**Change 3** — Reset `hasRespondedNegotiation` immediately when proposal changes (add to useEffect at line 253):
```typescript
useEffect(() => {
  // Reset immediately to prevent stale state flash
  setHasRespondedNegotiation(false);
  setRespondedSessionId(null);
  
  const checkNegotiationStatus = async () => {
    if (!open || !proposal.id) return;
    // ... existing query
  };
  checkNegotiationStatus();
}, [open, proposal.id]);
```

## Files Modified: 1
- `src/components/ProposalDetailDialog.tsx`


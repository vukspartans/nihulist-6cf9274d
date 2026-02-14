

# Fix: Approval Chain Not Loaded When Table Renders

## Root Cause

The `AccountantDashboard` waits for `useAccountantData().loading` before rendering, but does NOT wait for `useApprovalChain().isLoading`. The approval chain statuses load asynchronously from the `payment_status_definitions` table. When the table renders, the statuses array is still empty, so `getNextStep()` always returns `null` -- meaning no action button appears.

## Fix

**File: `src/pages/AccountantDashboard.tsx`**

In the main `AccountantDashboard` component, include `useApprovalChain().isLoading` in the loading check:

```
Current:  if (loading) { ... show spinner ... }
Fixed:    if (loading || approvalChainLoading) { ... show spinner ... }
```

Specifically:
- Destructure `isLoading` (aliased as `approvalChainLoading`) from the existing `useApprovalChain()` call
- Update the early-return loading condition to: `if (loading || approvalChainLoading)`

No other changes needed -- the button logic is already correct, it just needs the data to be ready before rendering.

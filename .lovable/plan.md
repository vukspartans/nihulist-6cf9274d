

# Fix: Historical Version Showing Current Price Instead of Original

## Problem

When viewing a historical version (e.g., V1) of a proposal in the ProposalDetailDialog, the current/latest price is displayed instead of the original price from that point in time.

## Root Cause

In `src/components/ProposalDetailDialog.tsx`, lines 133-136:

```typescript
if (viewVersion === (proposal.current_version || 1)) {
  setVersionData(null);
  return;
}
```

The `|| 1` fallback is the bug. When `proposal.current_version` is `null` or `undefined` (common for legacy proposals or those where the column wasn't updated after negotiation), this expression evaluates to `1`. So when viewing V1, the code thinks "V1 is the current version" and skips fetching version data, falling back to `proposal.price` — which is the **mutable, latest** price.

## Fix

**File: `src/components/ProposalDetailDialog.tsx`**

**Change 1** — Fix the "skip fetch" condition (line 134):

```typescript
// Before:
if (viewVersion === (proposal.current_version || 1)) {

// After:
if (proposal.current_version && viewVersion === proposal.current_version) {
```

This ensures version data is always fetched from `proposal_versions` unless we **know** the requested version matches the current one. If `current_version` is null/undefined, we never skip — we always fetch.

**Change 2** — Fix the matching `isViewingHistoricalVersion` check (line 123):

```typescript
// Before:
const isViewingHistoricalVersion = viewVersion !== undefined && viewVersion !== (proposal.current_version || 1);

// After:
const isViewingHistoricalVersion = viewVersion !== undefined && viewVersion !== proposal.current_version;
```

This makes the yellow "You are viewing a historical version" banner consistent with the data fetch logic: if `current_version` is null, any specified `viewVersion` is treated as historical.

Two lines changed, one file.


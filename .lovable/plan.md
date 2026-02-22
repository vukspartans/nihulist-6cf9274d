

# Fix: Display Hebrew Labels for Fee Units in Proposal Comparison Table

## Problem

In the entrepreneur's "received proposals" view (`ProposalComparisonTable.tsx`), fee item units are displayed as raw English values (e.g., `lump_sum`) instead of Hebrew labels (e.g., `קומפ'`).

## Root Cause

Line 410 of `ProposalComparisonTable.tsx` renders `{item.unit || '-'}` directly without passing it through `getFeeUnitLabel()` from `@/constants/rfpUnits`.

## Fix

### File: `src/components/ProposalComparisonTable.tsx`

1. Add import for `getFeeUnitLabel` from `@/constants/rfpUnits`
2. Replace line 410:
   - Before: `{item.unit || '-'}`
   - After: `{getFeeUnitLabel(item.unit || '') || '-'}`

Two lines changed total.


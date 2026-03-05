

# Fix: Remove Percentage (%) Unit from Fee Item Inputs

## Problem

The `%` (percentage) unit is still available as a selectable option when consultants add fee items during proposal submission. Per project rules, **vendors must submit fixed currency amounts (₪) only** — percentage-based pricing is not allowed.

The percentage unit appears in the consultant's unit dropdown (in `ConsultantFeeTable.tsx` line 387) because it's still defined in three places.

## Changes

### 1. `src/constants/rfpUnits.ts` — Remove from `FEE_UNITS` array
Remove `{ value: 'percentage', label: '%' }` from line 10.

### 2. `src/types/rfpRequest.ts` — Remove from `FeeUnit` type
Remove `| 'percentage'` from line 10.

### 3. `src/components/proposal/ConsultantFeeTable.tsx` — Remove from `UNIT_LABELS`
Remove `percentage: '%'` from line 26.

### Legacy handling
Existing records with `unit: 'percentage'` will still render correctly because `getFeeUnitLabel` falls back to showing the raw value, and display code uses `UNIT_LABELS[item.unit] || item.unit`. No data migration needed.


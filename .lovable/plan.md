

# Index Calculation Logic in Payment Module

## Overview

When an advisor submits a payment request (invoice), the system should automatically calculate the index adjustment by comparing the contract's base index value with the current month's index value. This ensures fair price linkage as agreed in the contract.

## Current State

- **Contract data**: The RFP invite's `payment_terms` JSON already stores `index_type` (e.g., "cpi"), `index_base_value`, and `index_base_month`
- **Payment requests table**: Has no index-related columns -- only stores flat `amount`, `vat_amount`, `total_amount`
- **No calculation logic exists** -- the UI text in `PaymentTermsTab` mentions the system will calculate the difference but it's not implemented

## What Will Be Built

### 1. Database: Add index columns to `payment_requests`

Add 5 new columns to store the index calculation per payment request:

| Column | Type | Purpose |
|--------|------|---------|
| `index_type` | text | The index type from the contract (e.g., "cpi") |
| `index_base_value` | numeric | The base index value set in the contract |
| `index_current_value` | numeric | The index value at time of invoice submission |
| `index_adjustment_factor` | numeric | Ratio: current / base (e.g., 1.023 for 2.3% increase) |
| `index_adjusted_amount` | numeric | The final amount after index adjustment (before VAT) |

### 2. Frontend: Index calculation in `CreatePaymentRequestDialog`

When creating a payment request:
- Fetch the contract's index terms from the linked `rfp_invite.payment_terms` (via `project_advisor_id` -> `proposal_id` -> `rfp_invite`)
- If an index is defined (`index_type != 'none'`), show an "Index Adjustment" section:
  - Display the contract's base index value and type (read-only)
  - Input field for "Current index value" (ערך מדד נוכחי) -- the advisor enters the current month's published index
  - Auto-calculate: adjustment factor = current / base
  - Auto-calculate: adjusted amount = original amount x adjustment factor
  - Show the breakdown: original amount, adjustment %, adjusted amount
- VAT is then calculated on the adjusted amount (not the original)

### 3. Frontend: Display index details in `PaymentRequestDetailDialog`

When viewing a payment request that has index data:
- Show an "Index Adjustment" section with:
  - Index type label (e.g., "מדד המחירים לצרכן")
  - Base value and current value
  - Adjustment factor as percentage (e.g., "+2.3%")
  - Original amount vs adjusted amount

### 4. Update `PaymentRequest` type and hook

- Add the 5 new index fields to the `PaymentRequest` TypeScript type
- Update `useProjectPayments.createPaymentRequest` to pass the index data when inserting

## Technical Details

### Files to Create/Modify

| File | Change |
|------|--------|
| **Migration** | `ALTER TABLE payment_requests ADD COLUMN index_type text, ADD COLUMN index_base_value numeric, ADD COLUMN index_current_value numeric, ADD COLUMN index_adjustment_factor numeric, ADD COLUMN index_adjusted_amount numeric` |
| `src/types/payment.ts` | Add 5 index fields to `PaymentRequest` interface |
| `src/components/payments/CreatePaymentRequestDialog.tsx` | Add index lookup from contract, current value input, auto-calculation display |
| `src/components/payments/PaymentRequestDetailDialog.tsx` | Display index adjustment breakdown when present |
| `src/hooks/useProjectPayments.ts` | Pass index fields in `createPaymentRequest` insert |

### Calculation Formula

```text
adjustment_factor = index_current_value / index_base_value
index_adjusted_amount = amount * adjustment_factor
vat_amount = index_adjusted_amount * (vat_percent / 100)
total_amount = index_adjusted_amount + vat_amount
```

### Data Flow

1. Advisor creates payment request -> dialog fetches contract's index terms from `rfp_invites.payment_terms`
2. If index exists, advisor enters current month's published index value
3. System calculates adjustment factor and adjusted amount in real-time
4. On submit, all index fields are saved to `payment_requests`
5. Detail view shows the full breakdown

### Edge Cases
- If `index_type = 'none'` or no index set: skip adjustment, amount stays as-is
- If `index_base_value` is null/zero: show warning, disable adjustment
- If contract has no linked RFP invite: no index adjustment available

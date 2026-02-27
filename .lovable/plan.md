

# Bug Fix: Payment Term Type Not Saved in conditions_json

## Problem

The consultant's selected payment term type (`paymentTermType` dropdown - e.g., "שוטף + 30") is stored as a separate variable but never written into `conditions_json`. The entrepreneur's comparison table reads `conditions_json.payment_term_type`, which is always empty, showing "לא צוין".

## Data Flow

```text
Consultant selects "שוטף + 30" → paymentTermType state
                                      ↓
                         useProposalSubmit receives it
                         BUT only uses it for change notifications
                                      ↓
                         conditions_json = data.conditions (from ConditionsBuilder)
                         ← payment_term_type is MISSING here
                                      ↓
                         Entrepreneur sees "לא צוין"
```

## Fix

**File: `src/hooks/useProposalSubmit.ts`** (1 change)

Merge `paymentTermType` and `paymentTermsComment` into `conditions_json` before saving:

```typescript
// Line ~232: Change from:
conditions_json: data.conditions as any,

// To:
conditions_json: {
  ...data.conditions,
  ...(data.paymentTermType && { payment_term_type: data.paymentTermType }),
  ...(data.paymentTermsComment && { payment_terms_comment: data.paymentTermsComment }),
} as any,
```

This ensures the consultant's selected payment term type is persisted in `conditions_json` where the comparison table and approval dialog already read it from.

## Impact

- Fixes the "לא צוין" display in `ProposalComparisonTable` and `ProposalApprovalDialog`
- No schema changes needed - `conditions_json` is JSONB
- Existing proposals without this data will still show "לא צוין" (backward compatible)
- New submissions will correctly display the payment term




# Fix: Payment Terms Showing "לא צוין" in Proposals Table

## Problem
The proposals comparison table shows "לא צוין" (Not Specified) for payment terms, even though the data exists. This affects all proposals submitted before the payment terms tracking was added to `conditions_json`.

**Root cause**: Many proposals have an empty `conditions_json: {}` because they were submitted before the `payment_term_type` field was merged into that JSON during submission. However, the **entrepreneur's original payment terms** are stored on the `rfp_invite.payment_terms.payment_term_type` field and are available as a fallback.

## Changes

### 1. `src/pages/ProjectDetail.tsx` — Add `payment_terms` to the RFP invite join

The current query joins `rfp_invite` but only selects `advisor_type`, `request_title`, and `deadline_at`. Add `payment_terms` so the entrepreneur's payment term type is available as a fallback.

```diff
  rfp_invite:rfp_invite_id (
    advisor_type,
    request_title,
-   deadline_at
+   deadline_at,
+   payment_terms
  )
```

### 2. `src/components/ProposalComparisonTable.tsx` — Add fallback logic

Update the `Proposal` interface to include the `rfp_invite` relation with `payment_terms`, then update the payment terms cell to fall back to `rfp_invite.payment_terms.payment_term_type` when `conditions_json.payment_term_type` is missing.

- Add `rfp_invite?: { payment_terms?: { payment_term_type?: string } }` to the `Proposal` interface
- Update line 368 from:
  ```tsx
  {getPaymentTermLabel(proposal.conditions_json?.payment_term_type)}
  ```
  to:
  ```tsx
  {getPaymentTermLabel(
    proposal.conditions_json?.payment_term_type 
    || (proposal.rfp_invite?.payment_terms as any)?.payment_term_type
  )}
  ```

This ensures: consultant-set terms take priority, entrepreneur-defined terms are the fallback, and "לא צוין" only shows when neither exists.

**Two files changed, minimal edits.**


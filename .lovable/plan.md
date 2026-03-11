

# Fix: Payment Terms Visibility for Entrepreneur

## Problem

When a consultant changes payment terms (e.g., from "שוטף + 30" to "שוטף + 15"), the entrepreneur never sees this change because:

1. **ProposalDetailDialog** only displays the entrepreneur's original RFP payment terms (`entrepreneurPaymentTerms` from `rfp_invites`), ignoring the consultant's `conditions_json.payment_term_type`.
2. **No change indicator** exists to highlight when a consultant selected different payment terms.
3. **EntrepreneurNegotiationView** reads from `session.proposal.conditions_json` correctly, but also lacks any change indicator vs. the original RFP terms.
4. **AdvisorProposalViewDialog** shows the raw `payment_term_type` value (e.g., "net_15") instead of using `getPaymentTermLabel()` for human-readable display.

## Changes

### 1. `src/components/ProposalDetailDialog.tsx` — Show consultant's payment terms with change indicator

In the "תנאי תשלום" (Payment Terms) section (~line 1132-1163):
- Display the **consultant's** `conditions_json.payment_term_type` using `getPaymentTermLabel()` as the primary value
- If it differs from `entrepreneurPaymentTerms.payment_term_type`, show a highlighted change badge: "עודכן ע״י היועץ" (Updated by consultant) with the original value shown for comparison
- Keep the entrepreneur's terms as reference context

### 2. `src/components/negotiation/EntrepreneurNegotiationView.tsx` — Add change indicator

In the payment terms card (~line 417-451):
- Fetch the original RFP payment terms (from `rfp_invites` via `proposal.rfp_invite_id`)
- Compare with `session.proposal.conditions_json.payment_term_type`
- If different, add a visible alert/badge: "תנאי התשלום עודכנו ע״י היועץ" with before/after values

### 3. `src/components/AdvisorProposalViewDialog.tsx` — Fix display formatting

At ~line 954, replace raw value display with `getPaymentTermLabel()` call so the advisor also sees human-readable labels.

### 4. `src/components/negotiation/NegotiationResponseView.tsx` — Add change indicator for consultant view

In the overview tab payment terms section (~line 924-959), fetch original RFP terms and show comparison if changed.

## No database changes needed

The consultant's `payment_term_type` is already persisted in `proposals.conditions_json` during submission. The `submit_negotiation_response` DB function preserves `conditions_json` when creating new versions. The issue is purely a UI display problem.

## Summary

Four files modified to ensure the consultant's payment terms are visible to the entrepreneur with clear change indicators when they differ from the original RFP terms.




# Preserve & Display Critical Proposal Data in Negotiation Views

## Problem
When a vendor or entrepreneur views a negotiation request/response, critical proposal information is lost or hidden. The `fetchNegotiationWithDetails` hook only fetches a subset of proposal fields (`id, price, supplier_name, current_version, advisor_id, fee_line_items, milestone_adjustments, rfp_invite_id`), omitting:

- **Scope of work** (`scope_text`)
- **Selected services** (`selected_services`, `services_notes`)
- **Payment terms & conditions** (`conditions_json` — payment_term_type, validity_days, assumptions, exclusions)
- **Consultant notes** (`consultant_request_notes`)
- **Timeline** (`timeline_days`)
- **Currency** (`currency`)

Both `NegotiationResponseView` (advisor) and `EntrepreneurNegotiationView` (entrepreneur) rely on this data but never receive it.

## Plan

### 1. Expand proposal query in `useNegotiation.ts` (`fetchNegotiationWithDetails`)

Add missing fields to the proposal select:

```
scope_text, selected_services, services_notes, consultant_request_notes, 
conditions_json, timeline_days, currency
```

Update the `NegotiationSessionWithDetails` type in `types/negotiation.ts` to include these fields in the `proposal` sub-type.

### 2. Add "Proposal Details" section to `NegotiationResponseView.tsx` (Advisor side)

In the **Overview** tab, after the price comparison card and message, add:

- **Scope of work** card — shows `session.proposal.scope_text` if present
- **Payment terms** card — renders `conditions_json.payment_term_type` label (using `getPaymentTermLabel`), validity days, and assumptions/exclusions
- **Timeline** info — shows `timeline_days` formatted as months/days

### 3. Add "Proposal Details" section to `EntrepreneurNegotiationView.tsx` (Entrepreneur side)

In the **Overview** tab, add:

- **Scope of work** card
- **Payment terms** card
- **Services** list (resolved from `selected_services`)
- **Consultant notes** if present

### 4. Files Changed

| File | Change |
|------|--------|
| `src/types/negotiation.ts` | Add `scope_text`, `selected_services`, `services_notes`, `consultant_request_notes`, `conditions_json`, `timeline_days`, `currency` to `NegotiationSessionWithDetails.proposal` |
| `src/hooks/useNegotiation.ts` | Expand proposal select query + map new fields |
| `src/components/negotiation/NegotiationResponseView.tsx` | Add scope, payment terms, timeline cards in overview tab |
| `src/components/negotiation/EntrepreneurNegotiationView.tsx` | Add scope, payment terms, services cards in overview tab |


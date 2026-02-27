

# Bug Fix: Original price not shown in V1 of negotiation timeline

## Problem

In the "Sent RFPs" tab, the negotiation timeline shows the **current** (post-negotiation) price for all versions, including V1 "הצעה מקורית". This happens because `originalPrice` is read from `proposals.price`, which gets updated after each negotiation round.

In the screenshot: V1 and V2 both show ₪70,004 — the price after negotiation — instead of V1 showing the original submission price.

## Root Cause

**File: `src/hooks/useRFPInvitesWithDetails.ts`**

- Line 219: `originalPrice = matchedProposal?.price` reads from `proposals.price`, which is the **latest** price (updated by `submit_negotiation_response`).
- Line 148: This `originalPrice` is then used as the V1 step price in `buildNegotiationSteps`.
- The actual original price is stored in `proposal_versions` where `version_number = 1`.

## Fix

**File: `src/hooks/useRFPInvitesWithDetails.ts`** (2 changes)

1. **In `buildNegotiationSteps`** (~line 142-148): Look up the V1 version price from `propVersions` and use it for the original offer step instead of the passed `originalPrice`:

```typescript
// Get V1 price from versions if available (proposals.price gets updated after negotiations)
const v1Version = propVersions.find(v => v.version_number === 1);
const v1Price = v1Version?.price ?? originalPrice;

steps.push({
  ...
  price: v1Price,  // was: originalPrice
  ...
});
```

2. **Update `originalPrice` on the invite** (~line 280): Also use the V1 version price for the invite-level `originalPrice` field so the card header shows the correct original price:

```typescript
const v1Price = propVersions.find(v => v.version_number === 1)?.price;
originalPrice: v1Price ?? originalPrice,
```

This ensures V1 shows the true original submission price while V2+ show their respective version prices (already correct from `proposal_versions`).


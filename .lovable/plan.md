

# Fix: "New Price" in Negotiation Response Email Shows Previous Round's Price

## Root Cause

In `supabase/functions/send-negotiation-response/index.ts`, the email's `newPrice` is calculated independently on **line 211-213** by summing `consultant_response_price` from the `updated_line_items` input array:

```typescript
const newTotal = updated_line_items && updated_line_items.length > 0
  ? updated_line_items.reduce((sum, item) => sum + item.consultant_response_price, 0)
  : session.target_total || (session.proposal as any).price;
```

This is wrong for two reasons:
1. When the advisor "accepts" the entrepreneur's target price, the frontend may send `updated_line_items` with the **old prices** (from the current proposal) rather than the target prices — yielding the Round 2 total (₪89,000) instead of the Round 3 target (₪85,000).
2. The `updated_line_items` array may only contain **changed** items, not all items, making the sum incomplete.

Meanwhile, the database RPC `submit_negotiation_response` already computes the correct `new_price` by summing the **actual updated fee line items** and returns it in the result object (line 132 of the RPC: `'new_price', v_new_price`). This value is available in `result.new_price` but is never used for the email.

## Fix — 1 file

### `supabase/functions/send-negotiation-response/index.ts`

**Replace** the manual `newTotal` calculation (lines 210-213) with the authoritative price from the RPC result:

```typescript
// Use the actual price computed by the database function
const newTotal = Number(result.new_price) || 
  (updated_line_items && updated_line_items.length > 0
    ? updated_line_items.reduce((sum, item) => sum + item.consultant_response_price, 0)
    : session.target_total || (session.proposal as any).price);
```

This ensures the email always displays the same price that was persisted to `proposals.price` and `proposal_versions.price` by the RPC. The manual calculation is kept only as a fallback in the unlikely case `result.new_price` is missing.

## Files Modified: 1
- `supabase/functions/send-negotiation-response/index.ts`


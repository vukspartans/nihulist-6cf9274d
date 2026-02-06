

## Fix: UUID Cast Error in Negotiation Response

### Problem
When an advisor tries to submit a negotiation response, the database function `submit_negotiation_response` fails with:
```
invalid input syntax for type uuid: "idx-1"
```

This happens because the function attempts to cast ALL `line_item_id` values to UUID on line 147, but many line items use synthetic IDs like `idx-1` (index-based fallback) or string IDs like `fee-1` (from JSONB data).

### Root Cause Analysis

1. **Frontend ID Generation**: The `NegotiationResponseView` generates IDs using:
   ```typescript
   const itemId = item.item_id || `idx-${item.item_number ?? idx}`;
   ```
   
2. **Database Function Failure**: The `submit_negotiation_response` function at line 147:
   ```sql
   WHERE id = (v_item->>'line_item_id')::UUID
   ```
   This fails for non-UUID strings.

3. **Test Data Impact**: The recently added test data uses IDs like `fee-1`, `fee-2` which are also not valid UUIDs.

### Solution

Modify the `submit_negotiation_response` database function to:
1. Skip UUID-based operations for non-UUID line item IDs
2. Only attempt database record lookups for valid UUID IDs
3. Continue to update fee_line_items JSONB (which works with any ID format)

### Implementation

**File to modify:** Create new SQL migration

```sql
-- In the loop that processes line items (lines 143-169):
FOR v_item IN SELECT * FROM jsonb_array_elements(p_updated_line_items)
LOOP
  -- Check if line_item_id is a valid UUID before attempting DB lookup
  IF (v_item->>'line_item_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_prev_line_item 
    FROM public.proposal_line_items 
    WHERE id = (v_item->>'line_item_id')::UUID;
    
    IF FOUND THEN
      -- Insert/update logic for database-backed line items
    END IF;
  END IF;
  -- JSONB updates continue to work for all IDs
END LOOP;
```

### Changes Summary

| Location | Change |
|----------|--------|
| `submit_negotiation_response` function | Add UUID validation regex before casting |
| Loop over `p_updated_line_items` | Skip DB operations for non-UUID IDs |
| JSONB fee_line_items matching logic | Already uses string matching (line 97) - no change needed |

### Technical Details

The fix adds a PostgreSQL regex check before the UUID cast:
```sql
-- UUID regex pattern
'line_item_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
```

This matches the pattern already used in `send-negotiation-request/index.ts` (line 246).

### Testing After Fix

1. Login as Vendor 2: `vendor.test1+billding@example.com` / `TestPassword123!`
2. Navigate to Negotiations tab
3. Open the active negotiation request
4. Modify prices and submit response
5. Verify no UUID cast error occurs


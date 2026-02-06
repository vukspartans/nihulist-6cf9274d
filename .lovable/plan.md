
# Fix: Resolve Function Overload Ambiguity

## Problem
PostgREST cannot determine which database function to call because there are two overloaded versions of `submit_negotiation_response` with ambiguous signatures:

**Function 1 (5-arg canonical):**
- `p_session_id uuid`
- `p_consultant_message text DEFAULT NULL`
- `p_updated_line_items jsonb DEFAULT NULL`
- `p_milestone_adjustments jsonb DEFAULT NULL`
- `p_files jsonb DEFAULT NULL`

**Function 2 (3-arg wrapper):**
- `p_session_id uuid`
- `p_updated_line_items jsonb`
- `p_consultant_message text DEFAULT NULL`

When the edge function calls the RPC with `{p_session_id, p_updated_line_items, p_consultant_message}`, PostgREST sees that both functions could match and throws an ambiguity error.

## Solution
Drop the 3-arg wrapper function entirely. The 5-arg canonical function already has default values for `p_milestone_adjustments` and `p_files`, so existing calls will work without modification.

## Implementation Steps

### Step 1: Create Database Migration
Create a new SQL migration that drops the 3-arg function:

```sql
-- Drop the ambiguous 3-arg wrapper
DROP FUNCTION IF EXISTS public.submit_negotiation_response(uuid, jsonb, text);
```

### Step 2: Update TypeScript Types
After the migration, update `src/integrations/supabase/types.ts` to remove the duplicate function signature and keep only the 5-arg version.

## Technical Details

The edge function (`send-negotiation-response/index.ts`) currently calls:
```javascript
supabase.rpc("submit_negotiation_response", {
  p_session_id: session_id,
  p_updated_line_items: updated_line_items || [],
  p_consultant_message: consultant_message,
})
```

After removing the 3-arg wrapper, this call will correctly resolve to the 5-arg function since:
- `p_session_id` matches
- `p_updated_line_items` matches
- `p_consultant_message` matches
- `p_milestone_adjustments` uses default `NULL`
- `p_files` uses default `NULL`

## Testing Plan
1. Login as Vendor 2 (`vendor.test1+billding@example.com`)
2. Navigate to Negotiations tab
3. Open an active negotiation request
4. Modify line item prices
5. Submit response
6. Verify:
   - No ambiguity error
   - New proposal version created
   - Session status updates to "responded"

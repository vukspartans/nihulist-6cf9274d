

## Fix: Remove Invalid `updated_at` Reference in Proposals Update

### Problem
The `submit_negotiation_response` database function fails with:
```
column "updated_at" of relation "proposals" does not exist
```

### Root Cause
In the migration I just applied, line 155 attempts to update `updated_at` on the `proposals` table:
```sql
UPDATE proposals SET
  current_version = v_new_version_number,
  price = v_new_price,
  fee_line_items = COALESCE(v_updated_fee_items, fee_line_items),
  status = 'resubmitted',
  updated_at = NOW()  -- ERROR: This column doesn't exist!
WHERE id = v_session.proposal_id;
```

However, the `proposals` table does NOT have an `updated_at` column (verified via schema query).

**Note:** The `negotiation_sessions` table DOES have `updated_at`, so line 164 is correct.

### Solution
Create a new migration to update the function, removing the `updated_at` reference from the proposals UPDATE statement.

### Implementation

**File:** `supabase/migrations/[timestamp]_fix_proposals_updated_at.sql`

Update the `submit_negotiation_response` function with the corrected UPDATE statement:

```sql
-- Update proposal with new version and price
UPDATE proposals SET
  current_version = v_new_version_number,
  price = v_new_price,
  fee_line_items = COALESCE(v_updated_fee_items, fee_line_items),
  status = 'resubmitted'
  -- Removed: updated_at = NOW() (column doesn't exist)
WHERE id = v_session.proposal_id;
```

### Technical Summary

| Line | Table | Issue | Fix |
|------|-------|-------|-----|
| 155 | `proposals` | `updated_at` doesn't exist | Remove the line |
| 164 | `negotiation_sessions` | `updated_at` exists | Keep as-is |

### Testing After Fix
1. Login as Vendor 2: `vendor.test1+billding@example.com` / `TestPassword123!`
2. Navigate to Negotiations tab
3. Open the active negotiation request
4. Modify prices and submit response
5. Verify successful submission without errors


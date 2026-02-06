
# Fix: Add Missing Columns to `proposal_versions` Table

## Problem
The negotiation response fails with:
```
column "fee_line_items" of relation "proposal_versions" does not exist
```

## Root Cause
The `submit_negotiation_response` function attempts to insert data into the `proposal_versions` table using column names that don't exist:

**Function expects these columns in `proposal_versions`:**
- `fee_line_items` (JSONB)
- `milestone_adjustments` (JSONB)

**Actual columns in `proposal_versions`:**
- `line_items` (JSONB) - different name
- `milestone_adjustments` - missing entirely

The `proposals` table correctly has both `fee_line_items` and `milestone_adjustments` columns, but the `proposal_versions` table was not updated to match when these columns were added to proposals.

## Solution
Add the missing columns to the `proposal_versions` table to align with the function's expectations and the `proposals` table schema.

## Implementation

**SQL Migration:**

```sql
-- Add fee_line_items column to proposal_versions (if not exists)
ALTER TABLE proposal_versions 
ADD COLUMN IF NOT EXISTS fee_line_items JSONB;

-- Add milestone_adjustments column to proposal_versions (if not exists)
ALTER TABLE proposal_versions 
ADD COLUMN IF NOT EXISTS milestone_adjustments JSONB;
```

## Technical Details

The `proposal_versions` table is used to store historical snapshots of proposals during the negotiation process. Each version should capture the complete state of the proposal, including:
- Price and timeline
- Scope and terms
- Line item breakdown (`fee_line_items`)
- Milestone payment schedule (`milestone_adjustments`)

By adding these columns, the versioning system will correctly preserve all proposal data across negotiation iterations.

## Testing Plan
1. Login as Vendor 2 (`vendor.test1+billding@example.com` / `TestPassword123!`)
2. Navigate to Negotiations tab
3. Open an active negotiation request (status: awaiting_response)
4. Modify line item prices
5. Submit response
6. Verify:
   - No column error
   - New proposal version created with fee_line_items and milestone data
   - Session status updates to "responded"
   - Entrepreneur can view the counter-offer

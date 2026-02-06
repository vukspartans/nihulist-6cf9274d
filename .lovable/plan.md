
# Fix: Foreign Key Constraint Violation in `submit_negotiation_response`

## Problem
The negotiation response fails with:
```
insert or update on table "proposal_versions" violates foreign key constraint "proposal_versions_created_by_fkey"
```

## Root Cause
The `submit_negotiation_response` function inserts `v_session.consultant_advisor_id` into the `created_by` column:

```sql
created_by,
v_session.consultant_advisor_id  -- This is advisors.id, NOT auth.users.id
```

However, the `proposal_versions.created_by` column has a foreign key constraint:
```sql
created_by UUID REFERENCES auth.users(id)
```

The function is inserting an `advisors.id` into a column that expects an `auth.users.id`, causing the constraint violation.

## Solution
Modify the function to look up the advisor's `user_id` from the `advisors` table and use that value for `created_by`.

## Implementation

Create a SQL migration that updates the function:

```sql
CREATE OR REPLACE FUNCTION public.submit_negotiation_response(
  p_session_id uuid,
  p_consultant_message text DEFAULT NULL,
  p_updated_line_items jsonb DEFAULT NULL,
  p_milestone_adjustments jsonb DEFAULT NULL,
  p_files jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session negotiation_sessions%ROWTYPE;
  v_proposal proposals%ROWTYPE;
  v_advisor_user_id uuid;  -- NEW: Store advisor's auth user ID
  v_new_version_id uuid;
  v_new_version_number integer;
  v_item jsonb;
  v_new_price numeric;
  v_line_items jsonb;
  v_updated_fee_items jsonb;
BEGIN
  -- Get session with lock
  SELECT * INTO v_session
  FROM negotiation_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negotiation session not found';
  END IF;

  IF v_session.status != 'awaiting_response' THEN
    RAISE EXCEPTION 'Session is not awaiting response';
  END IF;

  -- Get proposal
  SELECT * INTO v_proposal
  FROM proposals
  WHERE id = v_session.proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  -- NEW: Get the advisor's user_id for the created_by field
  SELECT user_id INTO v_advisor_user_id
  FROM advisors
  WHERE id = v_session.consultant_advisor_id;

  -- ... (rest of function unchanged until INSERT) ...

  -- Create new proposal version
  INSERT INTO proposal_versions (
    -- ... columns ...
    created_by
  )
  VALUES (
    -- ... values ...
    v_advisor_user_id  -- FIX: Use auth.users.id instead of advisors.id
  );

  -- ... rest of function ...
END;
$$;
```

## Technical Details

The key changes:
1. Declare `v_advisor_user_id uuid` variable
2. Query `advisors.user_id` using `v_session.consultant_advisor_id`
3. Use `v_advisor_user_id` in the INSERT instead of `v_session.consultant_advisor_id`

This ensures the `created_by` column receives a valid `auth.users.id` that satisfies the foreign key constraint.

## Testing Plan
1. Login as Vendor 2
2. Navigate to Negotiations tab
3. Open an active negotiation request
4. Modify line item prices
5. Submit response
6. Verify:
   - No foreign key error
   - New proposal version created
   - Session status updates to "responded"

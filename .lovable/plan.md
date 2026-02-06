
## Fix: Incorrect Status Check in `submit_negotiation_response`

### Problem
The negotiation response fails with:
```
invalid input value for enum negotiation_status: "pending"
```

### Root Cause
The canonical `submit_negotiation_response` function (5-arg version) contains an incorrect status check on line 31:

```sql
IF v_session.status != 'pending' THEN
    RAISE EXCEPTION 'Session is not in pending status';
END IF;
```

However, the `negotiation_status` enum only contains these valid values:
- `open`
- `awaiting_response`
- `responded`
- `resolved`
- `cancelled`

The correct status to check is `'awaiting_response'` (the status set when an entrepreneur sends a negotiation request to an advisor).

### Evidence
Database query confirmed all active sessions have status `awaiting_response`:

| Session ID | Status |
|------------|--------|
| aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005 | awaiting_response |
| 6bc769a0-3f7d-429b-9782-1987a854296c | awaiting_response |

### Solution
Update the database function to check for `'awaiting_response'` instead of `'pending'`:

```sql
IF v_session.status != 'awaiting_response' THEN
    RAISE EXCEPTION 'Session is not awaiting response';
END IF;
```

### Implementation

**File:** New SQL migration

Replace the status check in the `submit_negotiation_response` function:

```sql
-- Before (incorrect):
IF v_session.status != 'pending' THEN
    RAISE EXCEPTION 'Session is not in pending status';
END IF;

-- After (correct):
IF v_session.status != 'awaiting_response' THEN
    RAISE EXCEPTION 'Session is not awaiting response';
END IF;
```

### Testing After Fix
1. Login as Vendor 2: `vendor.test1+billding@example.com` / `TestPassword123!`
2. Navigate to Negotiations tab
3. Open the active negotiation request (status: awaiting_response)
4. Modify prices and submit response
5. Verify successful submission without errors

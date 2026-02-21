

# Fix: Counter-Offer Not Appearing + Entrepreneur Notification for New Proposals

## Issues Identified

### Issue 1: Counter-offer not appearing (main bug)
When an advisor responds to a negotiation (submits a counter-offer), the database function `submit_negotiation_response` updates the proposal status to `resubmitted` but does **not** reset `seen_by_entrepreneur_at` to `NULL`. Since the entrepreneur dashboard's notification system filters by `seen_by_entrepreneur_at IS NULL`, the counter-offer is invisible to the entrepreneur.

**Evidence**: Proposal `924b70e7` has status `resubmitted` (counter-offer submitted on Feb 21), but `seen_by_entrepreneur_at` is still set to `2026-02-02` (from the original view). The entrepreneur never gets notified.

### Issue 2: Notification bell for new proposals
The notification system already handles `submitted` and `resubmitted` statuses, but the counter-offer scenario is broken because of Issue 1. Once Issue 1 is fixed, notifications will work correctly.

---

## Plan

### Step 1: Fix the database function `submit_negotiation_response`
Add a line to reset `seen_by_entrepreneur_at` to `NULL` when the proposal status is updated to `resubmitted`. This ensures the entrepreneur gets a fresh notification.

**Change in the UPDATE proposals statement:**
```sql
UPDATE proposals
SET 
  current_version = v_new_version_number,
  price = v_new_price,
  fee_line_items = v_line_items,
  milestone_adjustments = COALESCE(p_milestone_adjustments, proposals.milestone_adjustments),
  status = 'resubmitted',
  seen_by_entrepreneur_at = NULL  -- Reset so entrepreneur sees the counter-offer
WHERE id = v_proposal.id;
```

This requires a new Supabase migration.

### Step 2: Fix existing data
Run a one-time update to reset `seen_by_entrepreneur_at` for proposals that are currently in `resubmitted` status with active `responded` negotiation sessions, so the entrepreneur can see the existing counter-offer:

```sql
UPDATE proposals 
SET seen_by_entrepreneur_at = NULL 
WHERE status = 'resubmitted' 
  AND seen_by_entrepreneur_at IS NOT NULL;
```

### Step 3: Verify notification flow
After the fix, the entrepreneur dashboard's `fetchUnseenProposalCounts` query (which filters by `seen_by_entrepreneur_at IS NULL` and `status IN ('submitted', 'resubmitted')`) will correctly pick up counter-offers and display them in the notification bell.

---

## Technical Details

- **Migration file**: New SQL migration to `CREATE OR REPLACE FUNCTION submit_negotiation_response` with the `seen_by_entrepreneur_at = NULL` addition
- **No frontend changes needed**: The notification system already handles `resubmitted` status correctly -- the bug is purely in the database function
- **Risk**: Low -- single line addition to an existing UPDATE statement


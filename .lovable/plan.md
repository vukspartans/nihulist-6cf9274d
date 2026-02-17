

# Fix: Proposal Submission Trigger Error

## Root Cause

Migration `20260212144958` (security hardening) accidentally replaced the `validate_proposal_deadline()` trigger function with a simplified version that references `NEW.deadline` -- a column that **does not exist** on the `proposals` table.

**Broken version (current):**
```sql
IF NEW.deadline IS NOT NULL AND NEW.deadline < NOW() THEN
  RAISE EXCEPTION 'Cannot set a deadline in the past';
END IF;
```

**Original working version** (from migration `20251103134054`) correctly looks up the deadline from `rfp_invites.deadline_at`.

## Fix

Create a new migration that restores the correct function:

**New file: `supabase/migrations/[timestamp]_fix_proposal_deadline_trigger.sql`**

```sql
CREATE OR REPLACE FUNCTION public.validate_proposal_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT deadline_at, status INTO v_invite
  FROM public.rfp_invites
  WHERE rfp_id = (
    SELECT rfp_id FROM public.rfp_invites
    WHERE advisor_id = NEW.advisor_id
    AND rfp_id IN (
      SELECT id FROM public.rfps WHERE project_id = NEW.project_id
    )
    LIMIT 1
  );

  IF FOUND THEN
    IF v_invite.deadline_at IS NOT NULL AND v_invite.deadline_at < NOW() THEN
      RAISE EXCEPTION 'Cannot submit proposal: deadline has expired at %', v_invite.deadline_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
```

This restores the original logic that checks `rfp_invites.deadline_at` instead of the non-existent `NEW.deadline`, while keeping the `SET search_path = public` security fix from the hardening migration.

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/migrations/[new]_fix_proposal_deadline_trigger.sql` | Restore correct trigger function |


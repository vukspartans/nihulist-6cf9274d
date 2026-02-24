

# The RLS Policy Cannot Be Fixed Via Migration — Direct SQL Required

## The Problem

The policy **still** has `p.name` instead of `name`. The DROP + CREATE approach isn't working in your SQL Editor session — likely Supabase is silently not applying it, or there's a copy-paste issue with the `name` reference being ambiguous.

## New Approach: Use `objects.name` Explicitly

The issue may be that bare `name` is ambiguous between `storage.objects.name` and other columns. We need to use the fully qualified reference.

**Run this exact SQL in the Supabase SQL Editor — copy the entire block:**

```sql
-- Step 1: Drop the old policy
DROP POLICY "Invited advisors can read project files" ON storage.objects;
```

Run that first, confirm "Success", then run:

```sql
-- Step 2: Create the fixed policy  
CREATE POLICY "Invited advisors can read project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM rfp_invites ri
    JOIN advisors a ON a.id = ri.advisor_id
    JOIN rfps r ON r.id = ri.rfp_id
    JOIN projects p ON p.id = r.project_id
    WHERE a.user_id = auth.uid()
      AND (p.id)::text = (storage.foldername(objects.name))[1]
  )
);
```

**Key difference:** Using `objects.name` (the table alias for `storage.objects`) instead of bare `name` to eliminate any ambiguity.

**Run them as two separate statements** — first the DROP, then the CREATE. This avoids any issue with combined execution.

After both succeed, run the verification query again to confirm the output shows `objects.name` instead of `p.name`.


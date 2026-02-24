

# Fix: Project Files Not Accessible to Advisors (Vendors)

## Root Cause

The RLS policy **"Invited advisors can read project files"** on `storage.objects` has a bug in its SQL condition.

**Current (broken):**
```sql
(p.id)::text = (storage.foldername(p.name))[1]
```
This compares the project UUID against `storage.foldername(p.name)` -- which is the **project's name column** from the `projects` table (e.g., "א.ד. גורדון 16, ת"א"). This will never match the folder structure in storage, which uses the project UUID as the folder name.

**Correct:**
```sql
(p.id)::text = (storage.foldername(name))[1]
```
Here, `name` refers to `storage.objects.name` -- the actual storage path (e.g., `1f4b91e4-4d0f-4f07-9fb6-625192dea1fc/file.pdf`). The first folder segment is the project UUID, which correctly matches `p.id`.

The files exist in storage and the `project_files` table references are correct. The 404 errors on signed URL creation are caused by this RLS policy silently denying access.

## Fix

Create a migration that drops the broken policy and recreates it with the corrected condition:

```sql
DROP POLICY IF EXISTS "Invited advisors can read project files" ON storage.objects;

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
      AND (p.id)::text = (storage.foldername(name))[1]
  )
);
```

## Impact

- Advisors (vendors) invited to a project will be able to view and download project files from the RFP details page
- No changes to application code required -- the frontend logic in `RFPDetails.tsx` is already correct
- No impact on project owner access (separate policies handle that)
- Security is maintained: advisors can only access files for projects they are explicitly invited to via `rfp_invites`


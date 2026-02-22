
# Fix: Advisor File Downloads and Title Bug

## Bugs Identified

### Bug 1 & 2: Empty file downloads (RFPDetails + SubmitProposal pages)

**Root Cause:** Two separate issues:

1. **`project-files` bucket has NO RLS policy for advisors.** The RFPDetails page tries to generate signed URLs for project files (line 567), but advisors are blocked by RLS. The `is_project_owner()` check fails for advisors, so `createSignedUrl` returns an error silently, and the original (likely expired) URL is used instead -- resulting in empty downloads.

2. **SubmitProposal page never refreshes signed URLs.** The `request_files` URLs stored in the database expire after 7 days. Unlike RFPDetails (which calls `refreshFileUrls`), SubmitProposal uses the original stored URLs directly (`href={file.url}`), so they download empty after expiration.

3. **`rfp-request-files` RLS policy may fail for some advisors.** The policy checks `request_files::text LIKE '%' || objects.name || '%'` -- but if another invite for the same advisor has `request_files = []`, the match fails. Additionally, the text-based LIKE approach is fragile.

### Bug 3: Wrong title ("תכנון אינסטלציה" for non-plumbing advisors)

**Root Cause:** The `send_rfp_invitations_to_advisors` DB function receives a single `request_title` parameter and stores it identically on ALL invites in the batch. When an entrepreneur sends RFPs to multiple advisor types simultaneously, every invite gets the same title (typically the last category selected in the UI).

---

## Fix Plan

### 1. Add advisor read access to `project-files` bucket (SQL Migration)

Create an RLS policy allowing advisors who are invited to a project to read that project's files:

```sql
CREATE POLICY "Invited advisors can read project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM rfp_invites ri
    JOIN advisors a ON a.id = ri.advisor_id
    JOIN rfps r ON r.id = ri.rfp_id
    JOIN projects p ON p.id = r.project_id
    WHERE a.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
  )
);
```

### 2. Fix `rfp-request-files` RLS policy for advisors

Replace the fragile text LIKE match with a proper path-based check:

```sql
-- Drop old policy
DROP POLICY "Advisors can view invited RFP files" ON storage.objects;

-- Create improved policy using path matching
CREATE POLICY "Advisors can view invited RFP files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rfp-request-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM rfp_invites ri
    JOIN advisors a ON a.id = ri.advisor_id
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(name))[1] IN (
        SELECT p.id::text FROM projects p
        JOIN rfps r ON r.project_id = p.id
        WHERE r.id = ri.rfp_id
      )
  )
);
```

### 3. Add signed URL refresh on SubmitProposal page

Update `src/pages/SubmitProposal.tsx` to refresh file URLs after fetching invite data, similar to how `RFPDetails.tsx` does it:

- After parsing `requestFiles` from the invite, call `createSignedUrl` for each file using the `path` field
- Update the file objects with fresh signed URLs before setting state

### 4. Fix title per advisor type

This is a data-level bug in the `send_rfp_invitations_to_advisors` DB function. The fix requires the frontend to pass per-invite titles. Two options:

**Option A (Recommended - simpler):** Modify the `useRFP.tsx` `saveAdvisorTypeData` function to update each invite's `request_title` individually after the RPC creates them. The title is already generated per category in the RFP wizard UI.

**Option B:** Modify the DB function signature to accept per-type titles. This is more invasive.

We will implement Option A: after `send_rfp_invitations_to_advisors` returns, update each invite's `request_title` based on the `advisorTypeDataMap`.

---

## Technical Details

### Files to modify:
1. **SQL Migration** -- Add/fix RLS policies for both storage buckets
2. **`src/pages/SubmitProposal.tsx`** -- Add `refreshFileUrls` logic after loading invite data
3. **`src/hooks/useRFP.tsx`** -- Update `saveAdvisorTypeData` to set per-invite `request_title`

### Files to check:
- `src/components/RFPWizard.tsx` or `src/components/RequestEditorDialog.tsx` -- verify how `requestTitle` is generated per advisor type to ensure we have the right data for Option A

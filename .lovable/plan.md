
# Fix: Advisor File Downloads and Title Bug — COMPLETED

## Changes Made

### 1. ✅ RLS Policy: `project-files` bucket (SQL Migration)
Added `"Invited advisors can read project files"` policy allowing advisors with RFP invites to read project files via signed URLs.

### 2. ✅ RLS Policy: `rfp-request-files` bucket (SQL Migration)  
Replaced fragile `LIKE`-based policy with proper path-based check using `storage.foldername(name)` matching project IDs through the `rfp_invites → rfps → projects` join.

### 3. ✅ Signed URL refresh on SubmitProposal page
Added URL refresh logic in `fetchEntrepreneurData()` for both `request_files` and `service_details_file`, matching the pattern already used in `RFPDetails.tsx`.

### 4. ✅ Per-advisor-type request title
Updated `saveAdvisorTypeData()` in `useRFP.tsx` to set `request_title` per invite based on `advisorTypeDataMap[advisorType].requestTitle`, overriding the single title set by the DB function.

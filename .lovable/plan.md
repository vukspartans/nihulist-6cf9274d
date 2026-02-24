

# Why Downloaded PDFs Show "Failed to load PDF document"

## Root Cause (Already Fixed)

The RLS policy fix we just applied resolves the core issue. The chain of failure was:

1. **RLS policy denied access** → `createSignedUrl()` returned 404 for all project files
2. **Fallback used raw storage path** → Line 573 in `RFPDetails.tsx`: `signedData?.signedUrl || file.file_url` fell back to the raw path (e.g., `1f4b91e4-.../file.pdf`)
3. **Download fetched garbage** → `downloadFile()` at line 150 did `fetch(file.url)` on this invalid path, receiving an HTML error page instead of a PDF
4. **Saved HTML as PDF** → The blob was HTML content saved with a `.pdf` extension → "Failed to load PDF document"

The files themselves are intact in storage (verified: 5 PDFs exist with correct sizes and mimetype).

## Required Action

**Refresh the RFP details page.** The migration was just applied, so a page reload will trigger fresh `createSignedUrl()` calls that will now succeed with the corrected RLS policy.

## No Code Changes Needed

The download logic in `RFPDetails.tsx` is correct -- it properly creates signed URLs, fetches the blob, and triggers a download. The only issue was the RLS policy denying the signed URL creation, which is now fixed.


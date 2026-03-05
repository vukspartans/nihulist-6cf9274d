

# Fix: Consultants Cannot View Project Files in Negotiation Flow

## Root Cause

This is **not an RLS issue**. The database and storage policies already grant advisors/consultants access:
- `project_files` table: "Advisors can view project files for invited projects" policy exists and works
- `project-files` storage bucket: "Invited advisors can read project files" policy exists and works

The actual bug is in **how file URLs are constructed** in the negotiation views. The `project_files.file_url` column stores a **storage path** (e.g., `projectId/filename.pdf`), not a full URL. The negotiation code passes this raw path as the `url` property. When a user clicks to view/download, the code checks `file.url.includes("supabase")` — which is `false` for storage paths — and falls back to `window.open("projectId/filename.pdf")`, which is a relative URL and results in a 404 or blank page.

The `ProjectFilesManager` component (used by project owners) handles this correctly by explicitly calling `supabase.storage.from('project-files').createSignedUrl(path, ...)`. The negotiation views do not.

## Fix

### 1. `src/components/negotiation/NegotiationResponseView.tsx`
In the `loadProjectFiles` function (~line 277-290), after fetching `project_files` data, generate **signed URLs** from the `project-files` bucket instead of passing raw storage paths:

```tsx
// Before (broken):
url: f.file_url,  // "projectId/filename.pdf" — not a valid URL

// After (fixed):
// Create signed URLs for all project files in parallel
const signedUrls = await Promise.all(
  projectFilesData.map(f => 
    supabase.storage.from('project-files').createSignedUrl(f.file_url, 3600)
  )
);
// Map with resolved signed URLs
const additionalFiles = projectFilesData.map((f, i) => ({
  name: f.file_name,
  url: signedUrls[i]?.data?.signedUrl || f.file_url,
  size: f.size_mb ? f.size_mb * 1024 * 1024 : undefined,
  type: f.file_type,
}));
```

### 2. `src/hooks/useNegotiationSession.ts`
Same fix in `loadProjectFiles` (~line 88-94) — generate signed URLs for `project_files` entries:

```tsx
// Create signed URLs in parallel
const signedUrls = await Promise.all(
  projectFilesResult.data.map(f =>
    supabase.storage.from('project-files').createSignedUrl(f.file_url, 3600)
  )
);
const additionalFiles = projectFilesResult.data.map((f, i) => ({
  name: f.file_name,
  url: signedUrls[i]?.data?.signedUrl || f.file_url,
  ...
}));
```

### 3. Simplify view/download handlers in `NegotiationResponseView.tsx`
The `handleViewFile` and `handleDownloadFile` functions (~lines 298-346) currently have a fallback regex pattern to detect Supabase URLs. With signed URLs now being generated upfront, these handlers become simpler — they just open/download the URL directly. However, we should keep the existing logic as a safety net for `rfp_invites.request_files` which may still contain full Supabase URLs.

### Files to Change
| File | Change |
|------|--------|
| `src/components/negotiation/NegotiationResponseView.tsx` | Generate signed URLs for project_files entries |
| `src/hooks/useNegotiationSession.ts` | Generate signed URLs for project_files entries |

### Result
- Consultants/advisors will be able to view and download project files during negotiation
- No RLS or security changes needed — existing policies already grant access
- Signed URLs are generated in parallel (no N+1 performance issue)


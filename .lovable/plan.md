
# Plan: Standardize File Upload Size Limits to 20MB

## Current State Analysis

The codebase has inconsistent file upload limits scattered across multiple files:

| File | Current Limit | Issue |
|------|---------------|-------|
| `src/utils/storageQuota.ts` | 10 MB | Outdated constant |
| `src/utils/constants.ts` | 5 MB (FILE_LIMITS.MAX_FILE_SIZE_MB) | Incorrect constant |
| `src/components/FileUpload.tsx` | 20 MB (default) | ✅ Correct |
| `src/components/negotiation/NegotiationResponseView.tsx` | 10 MB (override) | Hardcoded override |
| `src/components/ProjectFilesManager.tsx` | 20 MB | ✅ Correct |
| `src/components/negotiation/NegotiationDialog.tsx` | 20 MB | ✅ Correct |

## Root Cause

1. **`storageQuota.ts`**: Line 9 has `MAX_FILE_SIZE: 10485760` (10 MB)
2. **`constants.ts`**: Line 37 has `MAX_FILE_SIZE_MB: 5` (5 MB)
3. **`NegotiationResponseView.tsx`**: Line 1522 has hardcoded `maxSize={10 * 1024 * 1024}` override

The hardcoded 10MB override in `NegotiationResponseView.tsx` is likely why users see the 10MB limit when uploading files in negotiations.

## Implementation Plan

### Change 1: Update `src/utils/storageQuota.ts` (Line 9)

**FROM:**
```typescript
MAX_FILE_SIZE: 10485760, // 10 MB per file
```

**TO:**
```typescript
MAX_FILE_SIZE: 20971520, // 20 MB per file
```

### Change 2: Update `src/utils/constants.ts` (Line 37)

**FROM:**
```typescript
MAX_FILE_SIZE_MB: 5,
```

**TO:**
```typescript
MAX_FILE_SIZE_MB: 20,
```

### Change 3: Fix `src/components/negotiation/NegotiationResponseView.tsx` (Line 1522)

**FROM:**
```typescript
<FileUpload
  maxFiles={5}
  maxSize={10 * 1024 * 1024}
  onUpload={setAdvisorUploadedFiles}
  advisorId={session?.proposal?.advisor_id}
```

**TO:**
```typescript
<FileUpload
  maxFiles={5}
  maxSize={20 * 1024 * 1024}
  onUpload={setAdvisorUploadedFiles}
  advisorId={session?.proposal?.advisor_id}
```

## Testing Checklist

1. **Upload 15MB File to Negotiation**
   - Login as advisor
   - Navigate to a negotiation response view
   - Attempt to upload a 15MB file
   - Verify upload succeeds without "file too large" error

2. **Upload 25MB File to Negotiation**
   - Attempt to upload a 25MB file
   - Verify upload fails with appropriate error message
   - Confirm error message shows 20MB as the limit

3. **Verify All Flows Accept 20MB**
   - Project files manager
   - Negotiation response files
   - Proposal attachments
   - All should consistently accept files up to 20MB

## Impact

- Users can now upload files up to 20MB consistently across all features
- No more confusion about different limits in different areas
- Constants are now aligned with actual component defaults

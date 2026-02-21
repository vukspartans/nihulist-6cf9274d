

# Fix: Proposal Approval Dialog Not Closing + Status Not Updating

## Issues from Bug Report

1. **"מסך ההצעה לא נעלם לאחר האישור"** -- After approving a proposal in the comparison dialog, the dialog stays open and doesn't close or visually reflect the change.

2. **"הסטטוס לא משתנה מממתין למאושר"** -- The status badge on the main project page still shows "ממתין" (waiting) instead of "מאושר" (approved) until navigating away and back.

## Root Cause

The `ProposalComparisonDialog` in `ProjectDetail.tsx` is rendered **without** an `onStatusChange` callback (line 593-599). After approval:
- The comparison dialog's internal `fetchProposals()` does refresh its own data (status updates inside the dialog)
- But the parent `ProjectDetail` page never refreshes its proposals list
- The comparison dialog itself stays open

## Planned Changes

### 1. `src/pages/ProjectDetail.tsx`
Add an `onStatusChange` callback to `ProposalComparisonDialog` that:
- Refreshes the parent page's proposals data
- Closes the comparison dialog after approval

### 2. `src/components/ProposalComparisonDialog.tsx`
After a successful approval:
- Close the comparison dialog automatically (call `onOpenChange(false)`)
- Ensure `onStatusChange` is called to propagate the update to the parent

## Technical Details

- **File 1** (`ProjectDetail.tsx`, line ~593-599): Add `onStatusChange` prop that calls the existing `fetchProposals()` function on the page and optionally closes the comparison dialog.
- **File 2** (`ProposalComparisonDialog.tsx`, line ~1190-1195): After approval succeeds, also close the parent comparison dialog via `onOpenChange(false)`.
- No database changes needed -- this is a frontend-only UI state management fix.


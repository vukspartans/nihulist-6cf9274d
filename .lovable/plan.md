

# Fix: UUID Resolution for Selected Services in PDF + Remaining Issues

## Current State After Previous Fixes

Most fixes from the plan are already implemented:
- `generateProposalPDF.ts` correctly calls `getFeeUnitLabel()` once (line 196) ✓
- All callers pass raw unit codes ✓
- `SubmitProposal.tsx` passes `projectName` and `advisorName` ✓
- `ConfirmProposalDialog` accepts/forwards `selectedServices`, `consultantNotes`, `servicesNotes` ✓

## Remaining Bug: Selected Services Render as UUIDs

**Root cause**: `SubmitProposal.tsx` line 1483 passes `selectedServices` which contains raw UUIDs (from `entrepreneurData.service_scope_items[].id`). These UUIDs flow through `ConfirmProposalDialog` directly into `generateProposalPDF()`, where `buildScopeOfWork` renders them as-is in the services list.

**Fix**: In `SubmitProposal.tsx`, resolve UUIDs to human-readable `task_name` values before passing to `ConfirmProposalDialog`.

### Change in `src/pages/SubmitProposal.tsx` (~line 1483)

Replace:
```tsx
selectedServices={selectedServices}
```

With:
```tsx
selectedServices={selectedServices.map(id => {
  const item = entrepreneurData?.service_scope_items?.find(s => s.id === id);
  return item?.task_name || id;
})}
```

This reuses the same resolution pattern already used in `getDeselectedServices()` (line 266-267) and in `ProposalDetailDialog` (line 441-444).

**One file changed, one line modified.**




# Fix Proposal PDF Generation Issues

## Issues Found

### 1. Double Unit Translation (Incorrect Units)
**Root cause**: Both `ProposalDetailDialog` (line 449) and `AdvisorProposalViewDialog` (line 477) call `getFeeUnitLabel(item.unit)` before passing to PDF. Then `buildFeeTable` in `generateProposalPDF.ts` (line 196) calls `getFeeUnitLabel()` *again*. The already-translated Hebrew label (e.g., "מ״ר") doesn't match any value key, so it falls back to the raw string or 'יחידה'.

**Fix**: Remove `getFeeUnitLabel()` from `buildFeeTable` (line 196) — the callers already translate. Alternatively, pass raw unit codes and let the PDF do the translation. The cleaner approach: pass raw codes, let `generateProposalPDF.ts` handle all formatting.

### 2. Missing Project Name in Pre-Submit PDF
**Root cause**: `SubmitProposal.tsx` renders `ConfirmProposalDialog` without passing `projectName` or `advisorName`. They default to 'פרויקט' and 'יועץ'.

**Fix**: Pass `rfpDetails.projects.name` as `projectName` and `advisorProfile.company_name` as `advisorName` from `SubmitProposal.tsx`.

### 3. Missing Services/Scope in Pre-Submit PDF
**Root cause**: `ConfirmProposalDialog` doesn't receive or forward `selectedServices`, `consultantNotes`, or `servicesNotes` to the PDF generator.

**Fix**: Add these props to `ConfirmProposalDialog` and pass them from `SubmitProposal.tsx`. Forward them to `generateProposalPDF()`.

### 4. Missing Advisor Details in Entrepreneur PDF
**Root cause**: `ProposalDetailDialog.handleExportPDF` doesn't pass `advisorCompany`, `advisorPhone`, `advisorEmail` even though `advisorInfo` is available.

**Fix**: Pass advisor details from `advisorInfo` and `proposal.advisors` to the PDF call.

## Files to Change

### `src/utils/generateProposalPDF.ts`
- Line 196: Remove the `getFeeUnitLabel()` call in `buildFeeTable` — display the `item.unit` value directly (callers already translate it).

### `src/pages/SubmitProposal.tsx`
- Pass `projectName={rfpDetails?.projects?.name}` and `advisorName={advisorProfile?.company_name}` to `ConfirmProposalDialog`.
- Pass `selectedServices`, `consultantNotes`/`servicesNotes` and `scopeText` data.

### `src/components/ConfirmProposalDialog.tsx`
- Add optional props: `selectedServices`, `consultantNotes`, `servicesNotes`.
- Forward these to `generateProposalPDF()` call.

### `src/components/ProposalDetailDialog.tsx`
- In `handleExportPDF`, pass `advisorCompany`, `advisorPhone`, `advisorEmail` from `advisorInfo`/`proposal.advisors`.

### `src/components/AdvisorProposalViewDialog.tsx`
- Pass raw `item.unit` instead of `getFeeUnitLabel(item.unit)` to align with the fix in `generateProposalPDF.ts`. Re-add `getFeeUnitLabel` call inside `buildFeeTable`.

**Correction on approach**: To avoid breaking any caller, the cleanest fix is: keep `getFeeUnitLabel()` in `buildFeeTable` but have callers pass raw unit codes. Update all three callers (ProposalDetailDialog, AdvisorProposalViewDialog, ConfirmProposalDialog) to pass `unit: item.unit` (raw code) instead of `unit: getFeeUnitLabel(item.unit)`.


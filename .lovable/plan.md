

# Add PDF Export to Advisor Proposal View Dialog

## What
Add an "ייצוא PDF" button inside the `AdvisorProposalViewDialog` (the "צפייה בהצעה שהגשתי" dialog) so advisors can print/export their submitted proposal in the same professional format defined in `generateProposalPDF.ts`.

## Where
Place the `ExportPDFButton` in the dialog header area (line ~473), next to the status badge, so it's always visible regardless of which tab is active.

## Changes — Single File: `src/components/AdvisorProposalViewDialog.tsx`

1. **Import** `ExportPDFButton` from `@/components/ui/ExportPDFButton` and `generateProposalPDF` + `ProposalPDFData` from `@/utils/generateProposalPDF`
2. **Add state** `pdfLoading` for the button loading state
3. **Add handler** `handleExportPDF` that maps the dialog's `proposal` data to `ProposalPDFData` and calls `generateProposalPDF`:
   - Maps `fee_line_items` to the PDF's `feeItems` format (snake_case → camelCase)
   - Maps `milestone_adjustments` or `conditions_json.milestones` to `milestones`
   - Passes `selectedServices` (resolved via `serviceNames`), `scopeText`, `consultantNotes`, `signaturePng`, `conditions`, `currency`, etc.
4. **Render** `<ExportPDFButton>` in the header row, between the title and the status badge


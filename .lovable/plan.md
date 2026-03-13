

# Fix: CSS Print Layout for Proposal PDF

## Current State

The PDF is generated in `src/utils/generateProposalPDF.ts` using a new browser window with inline HTML/CSS and `window.print()`. The existing `@media print` rules (lines 330-334) are minimal:

```css
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { margin: 15mm 12mm; }
  .section, table, .signature-section { page-break-inside: avoid; }
}
```

**Problems:**
1. Only `.section`, `table`, and `.signature-section` have `page-break-inside: avoid` — individual table rows (`tr`), the VAT summary, terms card, and details grid can still split across pages.
2. No `@page` size declaration for A4.
3. Body padding (32px 40px) combined with page margins can cause content overflow.
4. No `break-after`/`break-before` hints for logical page breaks (e.g., before signature section).
5. The header bottom border and section titles can be orphaned at the bottom of a page.

## Fix — 1 file

### `src/utils/generateProposalPDF.ts` — Update the `CSS` constant

Replace the `@media print` block (lines 330-334) with comprehensive print rules:

```css
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 0;
    font-size: 12px;
  }
  @page {
    size: A4;
    margin: 15mm 12mm;
  }

  /* Prevent content splitting */
  .section, table, .signature-section,
  .vat-summary, .terms-card, .details-grid,
  .sig-box, .header {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Keep section titles with their content */
  .section-title, .table-title, .subsection-title {
    page-break-after: avoid;
    break-after: avoid;
  }

  /* Signature section starts on new page if near bottom */
  .signature-section {
    page-break-before: auto;
    break-before: auto;
  }

  /* Hide nothing in the print window — it's already a clean document */
}
```

Also reduce body padding for print by adjusting the base body style to use a print-friendly padding (the `@media print` override above sets `padding: 0` since `@page margin` handles spacing).

## Files Modified: 1
- `src/utils/generateProposalPDF.ts`


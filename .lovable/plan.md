

# Redesign Proposal PDF Print Layout

## Overview
Complete overhaul of `generateProposalPDF.ts` to produce a professional, structured Hebrew price quote document matching the specification provided.

## Changes — Single File: `src/utils/generateProposalPDF.ts`

### 1. Data Interface Updates
- Add fields to `ProposalPDFData`: `advisorId` (ת.ז./ח.פ.), `advisorPhone`, `advisorEmail`, `advisorCompany`, `status` (draft/approved), `version`, `companyLogoUrl`, `startDate`
- These are optional — callers pass what they have; the PDF gracefully omits missing sections

### 2. New HTML Structure (RTL, Hebrew font)
Replace the entire HTML template with:

**Font:** Google Fonts `Assistant` (clean Hebrew sans-serif), loaded via `@import`

**Header:**
- Company logo placeholder (top-right, uses `companyLogoUrl` or stamp image)
- Title: `הצעת מחיר - {projectName}`
- Date line formatted as `DD/MM/YYYY`
- Status/version badge: `סטטוס: טיוטה` or `גרסה שאושרה`

**Consultant Details Section** (`פרטי היועץ`):
- Bordered card with name, ID, phone, email — displayed in a 2-column grid

**Scope of Work Section** (`היקף העבודה ופירוט שירותים`):
- Renders `scopeText` as rich text
- Lists `selectedServices` as bullet items
- Includes `servicesNotes` and `consultantNotes`

**Pricing Tables:**
- **Table 1 — Main Services**: Columns: `#`, `תיאור`, `כמות`, `יחידה`, `מחיר יחידה`, `סה״כ`. Alternating row colors (`#f9fafb` / `#fff`)
- **Table 2 — Optional Services**: Same structure, clearly labeled
- **Summary block**: `סה״כ לפני מע״מ`, `מע״מ (18%)` (calculated), `סה״כ כולל מע״מ` — prominent styling

### 3. Payment Milestones Table
- 3 columns: `שלב`, `אחוז (%)`, `סכום`
- Proper borders and header row

### 4. Terms & Footer
- **Payment Terms**: Bold, prominent section with `תנאי תשלום` value
- **Quote Validity**: `הצעה תקפה ל-{N} יום`
- **Execution Timeline**: `תאריך התחלה` / `סיום משוער` formatted as DD/MM/YYYY
- **Assumptions/Exclusions**: Rendered if present

### 5. Signature Area
- Two side-by-side boxes: `חתימת היועץ` (with signature/stamp images) and `חתימת הלקוח` (empty placeholder with line)

### 6. Footer
- `מסמך זה הופק באופן אוטומטי ע"י מערכת BillDing`

### 7. Print Styling
- `@media print` rules: proper page margins, page-break-inside avoidance on tables, color-adjust
- Alternating row colors on all tables
- All text RTL-aligned, table borders solid

### Callers
No changes needed to `ConfirmProposalDialog.tsx` or `ProposalDetailDialog.tsx` — all new fields are optional. Existing data flows through unchanged; the visual output simply improves.


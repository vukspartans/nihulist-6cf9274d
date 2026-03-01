

# Fix Financial Center CSV Export for Excel/Google Sheets Compatibility

## Current Issues Found

1. **Status column exports raw codes** (`prepared`, `submitted`, `paid`) instead of Hebrew labels — the table UI shows translated names via `PaymentStatusBadge`, but the export just dumps `r.status`
2. **Missing important columns**: `total_amount` (with VAT), `expected_payment_date`, `currency`, `vat_percent` — all available in `AccountantRequest` but not exported
3. **Amount column is unformatted** — just `String(r.amount)`, no thousands separator. Excel can handle raw numbers, but for readability a plain number (no currency symbol) is better so Excel treats it as numeric
4. **File extension `.csv`** is correct — BOM + UTF-8 CSV is the standard approach for Hebrew in Excel/Google Sheets. No need to switch to `.xlsx`.

## Plan

### Single file: `src/pages/AccountantDashboard.tsx`, lines 261-286

**1. Translate status codes to Hebrew labels**
- The component already has access to `approvalChain.statuses` (from `useApprovalChain`) which contains `code` → `name` mappings
- However, inside `LiabilitiesTab` the approval chain is passed as a prop. Need to check if it's available — it is, via the `statuses` array passed through the component
- Build a lookup: `const statusLabel = (code: string) => statuses.find(s => s.code === code)?.name || code;`
- Use `statusLabel(r.status)` instead of raw `r.status`

**2. Add missing columns to the export**
- Add: `סכום כולל מע״מ` (`total_amount`), `תאריך תשלום צפוי` (`expected_payment_date`), `אחוז מע״מ` (`vat_percent`)
- Update header array and row mapping accordingly

**3. Keep amounts as plain numbers**
- Export `r.amount` and `r.total_amount` as plain numbers (no currency symbol) so Excel recognizes them as numeric cells for SUM/formulas
- Add a `מטבע` column with `r.currency`

**4. Ensure the export uses the filtered view**
- Already correct — `filtered` is used, which respects the active status group + filters

### Updated export columns (13 columns):
`פרויקט | שם היועץ | תחום | תאריך הגשה | מס׳ חשבון | סכום ללא מע״מ | אחוז מע״מ | סכום כולל מע״מ | מטבע | אבן דרך | הערות היועץ | סטטוס | דחיפות | תאריך תשלום צפוי | הערות חשבונאי`


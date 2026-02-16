

# Phase 2.2 Gaps - Implementation Plan (3 Features)

## Feature 1: File Upload for Payment Requests

### Current State
The `CreatePaymentRequestDialog` has an `invoice_file_url` field in the database but NO upload UI. The spec requires optional file attachments (PDF invoices, email confirmations, etc.).

### Changes

**New component: `src/components/payments/PaymentFileUpload.tsx`**
- Reusable file upload widget using Supabase Storage bucket `payment-files`
- Accept PDF, images, and common document types
- 20MB max file size (per system standard)
- Upload to path: `{projectId}/{requestId or 'draft'}/{uuid}.{ext}`
- Display uploaded file with name, size, and delete option
- Return the storage path on upload

**Modify: `src/components/payments/CreatePaymentRequestDialog.tsx`**
- Add `PaymentFileUpload` component below the notes field
- Store uploaded file path in `invoice_file_url` field
- On form reset, clear file state
- Optional -- not required for form submission

**Modify: `src/components/payments/PaymentRequestDetailDialog.tsx`**
- Display attached file with download link (signed URL)
- Show file name and a download/preview button

**Modify: `src/components/payments/AdvisorPaymentsView.tsx`**
- Add file icon indicator in the table for requests that have `invoice_file_url`
- Clicking opens the file (signed URL)

**Database**: No schema changes needed -- `invoice_file_url` column already exists. Storage bucket `payment-files` may need creation (will check and create via Supabase if missing).

---

## Feature 2: Advanced Filtering in Accountant Liabilities Tab

### Current State
The `LiabilitiesTab` in `AccountantDashboard.tsx` only has open/closed toggle. The spec requires filtering by: project, advisor, specialty, status, dates, amounts, and overdue flags.

### Changes

**Modify: `src/pages/AccountantDashboard.tsx` (LiabilitiesTab)**
- Add a collapsible filter bar below the open/closed toggle with:
  - **Project filter**: `Select` dropdown populated from distinct project names in requests
  - **Advisor filter**: `Select` dropdown from distinct advisor names
  - **Status filter**: Multi-select or `Select` from payment_status_definitions
  - **Date range**: Two date inputs for submitted_at range
  - **Expected payment date range**: Two date inputs
  - **Amount range**: Min/max number inputs
  - **Overdue toggle**: Checkbox to show only requests past their expected_payment_date
- All filters applied client-side via `useMemo` on the existing `allRequests` array
- "Reset filters" button to clear all
- Filter state managed with a single `useState` object
- Filter bar toggleable via a "Filters" button with `Filter` icon to keep the UI clean when not needed

---

## Feature 3: Budget Overrun Validation

### Current State
`CreatePaymentRequestDialog` does not validate whether the requested amount exceeds the agreement amount. The spec requires: "deviation from the amount requires marking and justification."

### Changes

**Modify: `src/components/payments/CreatePaymentRequestDialog.tsx`**
- After milestone selection, calculate:
  - `agreementAmount`: The milestone's defined amount
  - `alreadyPaid`: Sum of all paid/pending requests for this milestone
  - `remainingBudget`: `agreementAmount - alreadyPaid`
- When user enters an amount exceeding `remainingBudget`:
  - Show a yellow `Alert` warning: "הסכום חורג מהיתרה לאבן הדרך ({remainingBudget})"
  - Make the `notes` field **required** with placeholder "נא לנמק את החריגה"
  - Add a visual indicator (warning icon) next to the amount field
- When user enters an amount exceeding the total advisor `fee_amount`:
  - Show a red `Alert` warning: "הסכום חורג מסך שכה"ט בהסכם"
  - Still allow submission but require justification in notes
- Fetch existing requests for the selected milestone to calculate cumulative usage
- New helper query in the submit handler to fetch sibling payment requests for the same milestone

**Modify: `src/hooks/useProjectPayments.ts`**
- No changes needed -- the validation logic stays in the dialog component since it's form-specific

---

## Implementation Order
1. **File Upload** -- standalone new component + small dialog changes
2. **Advanced Filtering** -- self-contained changes to AccountantDashboard
3. **Budget Validation** -- focused changes to CreatePaymentRequestDialog

## Files Summary
| File | Action |
|------|--------|
| `src/components/payments/PaymentFileUpload.tsx` | Create |
| `src/components/payments/CreatePaymentRequestDialog.tsx` | Modify (upload + validation) |
| `src/components/payments/PaymentRequestDetailDialog.tsx` | Modify (show file) |
| `src/components/payments/AdvisorPaymentsView.tsx` | Modify (file indicator) |
| `src/pages/AccountantDashboard.tsx` | Modify (filters) |


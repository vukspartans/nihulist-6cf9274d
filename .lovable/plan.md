

# Financial Center — RTL Fix, Date Pickers, Table Restructure & Urgency

## 1. Database Migration: Add `urgency` column to `payment_requests`
Add a new column `urgency text default 'normal'` with a CHECK constraint limiting values to `normal`, `medium`, `urgent`, `immediate` (רגילה, בינונית, דחופה, מיידית).

## 2. Update `useAccountantData.ts` — Fetch additional fields
Expand the query to include:
- `request_number`, `notes` from `payment_requests`
- Advisor specialty (via `rfp_invites` advisor_type, joined through project)

Update `AccountantRequest` interface to add: `request_number`, `notes`, `specialty`, `urgency`.

## 3. Restructure `LiabilitiesTab` table columns
Replace current 9-column table with the 13 columns specified (right-to-left):

| # | Column | Source | Notes |
|---|--------|--------|-------|
| 1 | פרויקט | project_name | existing |
| 2 | שם היועץ | advisor_company_name | existing |
| 3 | תחום | specialty | new field from rfp_invites |
| 4 | תאריך ההגשה | submitted_at | existing, reformatted |
| 5 | מס׳ חשבון | request_number | new field |
| 6 | סכום ללא מע״מ | amount (base, no VAT) | existing `amount` field |
| 7 | אבן דרך | milestone_name | existing |
| 8 | הערות היועץ | notes | new field from payment_requests |
| 9 | ניתוח AI | — | placeholder column, future feature (show "—" for now) |
| 10 | סטטוס | status | existing PaymentStatusBadge |
| 11 | קבצים | invoice_file_url | existing FileCell |
| 12 | דחיפות | urgency | new, editable Select with 4 options |
| 13 | הוסף הערות | — | inline input + save for accountant notes |

Remove the old "תשלום צפוי" inline date column and "פעולות" column — the action buttons (advance/mark paid) move into a row-expansion or are triggered from the status column context.

Actually, keep the action buttons but merge them into the status cell or add a 14th "פעולות" column to preserve advance/mark-paid functionality.

## 4. Replace all `<Input type="date">` with Calendar Popover pickers
Affected locations:
- **Advanced filters**: submittedFrom, submittedTo, expectedFrom, expectedTo (4 instances, lines 252-259)
- **Bulk date input** (line 218)
- **Paid date input** in actions column (line 329)

Each uses `Popover` + `PopoverTrigger` + `Calendar` with `pointer-events-auto` as per shadcn pattern.

## 5. RTL alignment fixes
- Add `dir="rtl"` to all `<SelectContent>` elements
- Ensure `text-right` on all table cells
- Add `dir="rtl"` to the advanced filters container
- Ensure Calendar popover aligns to `end` for RTL

## 6. Urgency selector in table
Inline `<Select>` in each row with 4 options, color-coded badges:
- רגילה (gray)
- בינונית (yellow)
- דחופה (orange)
- מיידית (red)

Selecting a value calls `updateRequestUrgency` which updates `payment_requests.urgency`.

## 7. "הוסף הערות" column
Small text input + save button per row. Saves to a new `accountant_notes` column on `payment_requests` (added in the same migration).

## 8. Export CSV update
Update CSV columns to match the new table structure.

### Technical Details
- Migration adds 2 columns: `urgency text default 'normal' check (urgency in ('normal','medium','urgent','immediate'))` and `accountant_notes text`
- `useAccountantData` expanded SELECT adds: `request_number, notes, urgency, accountant_notes`
- Specialty fetched via a secondary query joining `rfp_invites` → `rfps` → `project_id` to map `project_advisor_id` → `advisor_type`
- Calendar imports: `Calendar` from `@/components/ui/calendar`, `Popover/PopoverContent/PopoverTrigger` from `@/components/ui/popover`
- Table `min-w` increased to `min-w-[1200px]` to accommodate 13+ columns


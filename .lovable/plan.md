

# Financial Center — Simplify UI & Add Export

## Changes to `src/pages/AccountantDashboard.tsx`

### 1. Remove summary cards row (lines 716-756)
Delete the entire 3-card grid (סה"כ חוב פתוח, שולם, ספקים פעילים).

### 2. Replace "פתוחות/סגורות" buttons in LiabilitiesTab with 3 status-group buttons
Replace the current open/closed toggle (lines 143-157) with:
- **ממתין לאישור (X)** — requests in statuses: `submitted`, `in_accounting`, `professionally_approved`, `budget_approved`, `awaiting_payment`
- **מאושר (X)** — requests with status `paid`
- **שולם (X)** — kept separate for clarity

The count `(X)` shown on each button.

### 3. Add "ייצוא" (Export CSV) button
Position it in the toolbar row, right-aligned next to the existing סינון button. It exports the currently filtered/visible list as a CSV file with columns: project, advisor, milestone, status, amount, submission date, expected payment date.

### Technical Details
- CSV export uses native `Blob` + `URL.createObjectURL` — no new dependencies
- The `filter` state changes from `'open' | 'closed'` to `'pending' | 'approved' | 'paid'`
- Filter logic maps each button to the relevant status codes
- Export button uses `Download` icon from lucide-react


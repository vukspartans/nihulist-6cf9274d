

# Financial Center — Review & Cleanup

## Issues Found

### 1. Bug: "מאושר" and "שולם" buttons filter to identical data
Lines 111-114: both `approved` and `paid` cases filter `r.status === 'paid'`. The counts (lines 136-137) are also identical. There is no separate "approved" status in the system — `approved` doesn't exist as a payment request status. The intended mapping should be:
- **ממתין לאישור** → `submitted`, `in_accounting`, `professionally_approved`, `budget_approved`, `awaiting_payment`
- **מאושר** → `awaiting_payment` (last step before payment, already fully approved)
- **שולם** → `paid`

However, `awaiting_payment` is already in the "pending" group. The cleanest fix: collapse "מאושר" and "שולם" into just **two** buttons since no distinct "approved but not paid" status exists — OR redefine "מאושר" to mean `budget_approved` + `awaiting_payment` (approved stages) and "ממתין" to mean only the earlier stages (`submitted`, `in_accounting`, `professionally_approved`).

**Recommended mapping:**
- **ממתין לאישור** → `submitted`, `in_accounting`, `professionally_approved`
- **מאושר** → `budget_approved`, `awaiting_payment`
- **שולם** → `paid`

### 2. Redundant status filter in advanced filters
The advanced filter panel includes a "סטטוס" dropdown (lines 252-260) that duplicates the 3 status buttons. Since the buttons already filter by status group, the dropdown inside the filter panel is confusing and should be removed.

### 3. Skeleton loader still shows removed summary cards
Lines 690-703 render 3 skeleton cards that no longer exist in the actual view. Should be removed.

### 4. Space & layout optimizations
- The `Alert` banner (alpha warning, lines 745-748) takes vertical space on every visit. Consider removing it or making it dismissible — but since it's product-level, I'll leave it unless instructed.
- The loading skeleton grid of 3 cards should be removed to match the actual layout.

## Implementation Steps

### File: `src/pages/AccountantDashboard.tsx`

**A. Fix status button mapping (lines 104-115, 135-137)**
```
pending → submitted, in_accounting, professionally_approved
approved → budget_approved, awaiting_payment
paid → paid
```
Update `PENDING_STATUSES` to only early stages, add `APPROVED_STATUSES` array, fix filter logic and counts.

**B. Remove status dropdown from advanced filters (lines 251-260)**
Delete the "סטטוס" select in the filter panel since the 3 buttons already handle this.

**C. Fix skeleton loader (lines 690-703)**
Remove the 3-card skeleton grid to match the actual (card-free) layout.




# Fix Financial Center — Table Overflow, RTL Dropdowns & Responsiveness

## Issues Found
1. **Table overflows screen** — `min-w-[1400px]` forces horizontal scroll; 14 columns are too wide
2. **Filter dropdowns** — placeholder text ("פרויקט", "יועץ") appears left-aligned inside the trigger due to the base `SelectTrigger` having `flex-row-reverse`; the dropdown chevron sits on the wrong side for this RTL context
3. **"הוסף הערות" column header is cut off** on the left edge — visible in screenshot as "הוס"

## Plan

### 1. Reduce table width — make columns responsive
In `AccountantDashboard.tsx`, lines 395-476:
- Remove `min-w-[1400px]` from the Table — let it use natural sizing
- Add `whitespace-nowrap` to all `TableHead` elements to prevent header wrapping
- Set compact widths on less important columns: `w-10` on קבצים, `w-[80px]` on דחיפות, `w-[90px]` on מס׳ חשבון
- Truncate long text columns (הערות היועץ, הוסף הערות) with `max-w-[120px] truncate`
- Make the table use `text-xs` globally for density
- Keep `overflow-x-auto` as fallback but table should fit ~1280px screens now

### 2. Fix Select placeholder RTL alignment in filters
In the filter `SelectTrigger` elements (lines 347, 354):
- Override the base component's `flex-row-reverse` by adding `flex-row` and `text-right` classes to the filter SelectTriggers specifically
- This ensures the placeholder text starts from the right and chevron sits on the left (correct for RTL dropdowns)

### 3. Fix UrgencySelect RTL
In `UrgencySelect` (line 103):
- Add `text-right` to the SelectTrigger

### 4. Compact the "פעולות" column
- Reduce DatePickerField width in paid-date to `w-[100px]`
- Make action buttons smaller with `text-xs` and shorter labels

### Technical Details
- All changes in `src/pages/AccountantDashboard.tsx`
- No new dependencies or migrations
- The project/advisor filter Selects already pull from `projectOptions`/`advisorOptions` derived from `requests` — they are correctly wired and will populate when data exists


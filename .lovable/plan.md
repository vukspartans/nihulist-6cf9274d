

# Fix Template Loading Bugs: Duplicates and Missing Templates

## Problems Identified

### Bug 1: Duplicate/merged rows in fees and milestones
**Root cause**: Legacy templates exist in the database without a `category_id` (orphaned). When a category IS selected, the queries correctly filter by `category_id`. However, when no category is selected yet, the fallback queries pull in both advisor-specific AND generic (null) templates. If the user then selects a category, new templates load but old items may persist or mix in certain scenarios.

For milestones specifically (`PaymentTermsTab`), the fallback query at line 94 uses:
```
advisor_specialty.eq.${advisorType},advisor_specialty.is.null
```
This pulls 5 generic milestones (null advisor) PLUS advisor-specific ones, causing duplicates.

### Bug 2: Templates not loading for מעליות, נגישות, קרינה
**Root cause**: These advisor types have ALL their fee item templates assigned to a specific `category_id` AND `submission_method_id`. The auto-load in `FeeItemsTable` (line 120) requires ALL THREE: `advisorType`, `categoryId`, AND `submissionMethodId`. The `ServiceDetailsTab` auto-selects the default category, which cascades to method selection -- but there's a timing issue where the method hasn't been set yet when the fee tab tries to auto-load.

For milestones, the `PaymentTermsTab` auto-load effect only fires when `categoryId` changes AND milestones are empty, but doesn't re-fire when the component first mounts with a `categoryId` already set.

## Solution

### File 1: `src/components/rfp/PaymentTermsTab.tsx`

1. **Fix milestone query to exclude orphaned templates when categoryId is set**: When `categoryId` is provided, only query by `category_id` (already correct). When `categoryId` is NOT provided but `advisorType` is, filter strictly by `advisor_specialty` WITHOUT including `advisor_specialty.is.null` -- the generic null-advisor milestones are legacy data that shouldn't be mixed in.

2. **Fix auto-load to trigger on initial mount**: The current effect only fires when `categoryId` changes from a previous value. Add logic to also fire on initial mount when `categoryId` is already set and milestones are empty.

3. **Keep clear button and manual load button** as implemented.

### File 2: `src/components/rfp/FeeItemsTable.tsx`

1. **Fix fee items query to exclude orphaned templates**: When `categoryId` is provided, the query already filters correctly. But when only `advisorType` is set (no category), add `.is('category_id', null)` to avoid pulling category-assigned items alongside orphaned ones.

2. **Relax auto-load requirement**: Currently requires all three of `advisorType + categoryId + submissionMethodId`. Change to also auto-load when `categoryId` is set but `submissionMethodId` is not yet available -- in this case, load items matching `categoryId` without filtering by method. This fixes the timing issue for advisors where all templates have a method assigned.

3. **Add clear button**: Add the same "נקה" (Clear) pattern from PaymentTermsTab to allow users to empty fee items.

### Database cleanup (recommended, not code)
The admin page already shows a warning: "יש X תבניות קיימות שלא שויכו לסוג תבנית" (There are X existing templates not assigned to a template type). These orphaned templates should eventually be reassigned or deleted via the admin panel. The code fix ensures they don't interfere regardless.

## Technical Details

### PaymentTermsTab changes:
- Line 94: Change fallback from `advisor_specialty.eq.X,advisor_specialty.is.null` to just `advisor_specialty.eq.X`
- Lines 120-126 (auto-load effect): Also trigger when component mounts with a `categoryId` already present and milestones are empty (handle initial render, not just changes)

### FeeItemsTable changes:
- Lines 54-65: When `categoryId` is NOT provided, add `.is('category_id', null)` to exclude category-assigned templates from the fallback
- Lines 119-125: Allow auto-load when `categoryId` is set even without `submissionMethodId` (load all items for that category). Keep the composite key tracking to avoid duplicate loads
- Add a "נקה" (Clear) button next to "טען תבנית" matching PaymentTermsTab pattern

## Files to modify
1. `src/components/rfp/PaymentTermsTab.tsx`
2. `src/components/rfp/FeeItemsTable.tsx`


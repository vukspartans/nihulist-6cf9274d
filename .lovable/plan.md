
# Auto-Load Milestone Templates When Category Is Selected

## Problem
When the entrepreneur selects a template category in the RFP editor, the milestones tab stays empty and shows "לחצו על הוסף אבן דרך או תבנית נפוצה". The user expects milestones to load automatically based on the selected category, without needing to click the "טען תבנית" button.

## Solution
Add an auto-load effect in `PaymentTermsTab` that triggers when `categoryId` changes. The "טען תבנית" button remains available for manual reload/override. Users can still clear milestones or add items manually.

## Changes

### `src/components/rfp/PaymentTermsTab.tsx`

1. **Add auto-load effect**: Add a `useEffect` that watches `categoryId`. When it changes (and is truthy), automatically call `loadTemplate()` -- but only if the milestones array is currently empty (to avoid overwriting user edits).

2. **Add a "Clear" button**: Add a small clear/reset button (trash icon) next to "טען תבנית" so the user can empty all milestones if they want to start fresh or switch to manual entry.

3. **Suppress toast on auto-load**: The `loadTemplate` function currently shows a toast notification. For auto-load, we skip the toast to avoid annoying popups. The toast will still show when the user manually clicks "טען תבנית".

### Technical Details

- Extract the template-fetching logic into a reusable async function that accepts a `showToast` parameter
- The auto-load `useEffect` calls this function with `showToast: false` when `categoryId` changes and milestones are empty
- The "טען תבנית" button calls with `showToast: true` (current behavior, always loads even if milestones exist)
- A new "נקה" (Clear) button resets `milestone_payments` to an empty array
- Track `categoryId` changes with a ref to avoid re-running on every render

### File modified
- `src/components/rfp/PaymentTermsTab.tsx` (single file change)

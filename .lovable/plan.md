

# Fix RTL Layout for Service Scope Items (רשימת שירותים)

## Problem
In the שירותים (Services) tab on the RFP details page, each service row displays left-to-right instead of right-to-left. The checkmark icon and "תכולת העבודה:" badge appear on the wrong sides.

## Fix
Add `flex-row-reverse` to the flex container of each service scope item row in `RFPDetails.tsx` (line 971). This reverses the flex direction so:
- Checkmark icon appears on the **right**
- Task name text flows from the **right**
- Badges ("תכולת העבודה:", "אופציונלי") appear on the **left**

### File: `src/pages/RFPDetails.tsx`

**Line 971** - Change the row's flex container:
```
Before: className="flex items-center gap-2 p-2.5 rounded-lg ..."
After:  className="flex flex-row-reverse items-center gap-2 p-2.5 rounded-lg ..."
```

This is a single-line CSS class change. No logic or structural changes needed.

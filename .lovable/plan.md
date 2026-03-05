

# Fix: Remove Optional Item Checkboxes from Proposal Approval Dialog

## Problem
The approval dialog currently lets the entrepreneur check/uncheck optional fee items, toggling them into the grand total. This is **wrong behavior** — optional items are a **price list reference**, not a selection menu. If the entrepreneur later chooses to use an optional service, they pay according to the agreed contract rate. The approval dialog should simply **display** optional items as informational, not as selectable checkboxes.

The user's annotation: "אין צורך לסמן פריטים אופציונליים, פריטים אופציונליים הם סוג של מחירון שאם היזם בוחר לממש הוא ממשש בהתאם להסכם" (No need to check optional items — they're a price list; if the entrepreneur chooses to use them, they pay per the agreement).

## Changes

**File: `src/components/ProposalApprovalDialog.tsx`**

1. **Remove `selectedOptionalItems` state** and `toggleOptionalItem` function — no longer needed.

2. **Remove checkbox interaction from optional items list** — replace the clickable rows with checkboxes with static display rows (similar style to mandatory items but with blue/info styling to distinguish them).

3. **Remove optional total from grand total calculation** — `grandTotal` should equal `mandatoryTotal` only. Optional items are displayed for reference with a note like "מחירון לשירותים אופציונליים — בהתאם להסכם" (Price list for optional services — per agreement).

4. **Update dialog description** — change "סקור את פרטי ההצעה ובחר פריטים אופציונליים" → "סקור את פרטי ההצעה לפני אישור" (Review proposal details before approval).

5. **Update the optional items section header** — add an explanatory note: "פריטים אלו הם מחירון לשירותים נוספים. מימוש בהתאם להסכם." (These items are a price list for additional services. Usage per agreement.)

6. **Clean up reset logic** — remove `setSelectedOptionalItems(new Set())` from the `useEffect` resets.

### Summary of removals
- `selectedOptionalItems` state
- `toggleOptionalItem` function  
- `Checkbox` components inside optional items
- `selectedOptionalTotal` calculation
- `onClick` handlers on optional item rows
- Optional total added to `grandTotal`

### What stays
- Optional items are still **displayed** in the blue-styled section
- Their individual prices are shown for reference
- A subtotal line shows "סה״כ פריטים אופציונליים (מחירון)" for transparency
- The grand total only includes mandatory items


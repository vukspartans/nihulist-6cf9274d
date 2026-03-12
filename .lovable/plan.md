

# Fix: "Confirm Updated Offer" Popup Triggered Without Manual Changes

## Root Cause

In `NegotiationResponseView.tsx`, when the advisor opens a negotiation request, `updatedLineItems` is initialized with the **entrepreneur's target prices** (lines 139-159). This means:

1. `newTotal` immediately equals `targetTotal` (since all items default to target prices)
2. When the advisor clicks "Submit Updated Offer" **without touching anything**, the check at line 1786 (`newTotal === targetTotal`) triggers the `showAcceptTargetConfirm` dialog
3. This dialog shows "original price → target price" with a percentage reduction (e.g., -9%), making it look like the advisor made a change

The advisor sees a "price change warning" for a change they didn't make — the system pre-filled the target prices and then warned about them.

## Fix

Track whether the advisor has manually edited any prices. If no manual edits were made and they click submit, treat it as a direct acceptance of the target prices — skip the confusing "confirm change" popup and submit directly.

### Changes in `src/components/negotiation/NegotiationResponseView.tsx`

1. **Add a `hasManualEdits` state** (boolean, default `false`) that flips to `true` when `handlePriceChange` is called by user interaction (not initialization).

2. **Update the submit button logic** (line 1784-1790):
   - If `!hasManualEdits && newTotal === targetTotal` → submit directly via `handleAcceptTarget()` (no popup)
   - If `hasManualEdits && newTotal === targetTotal` → show `showAcceptTargetConfirm` (advisor manually set prices back to target)
   - If `newTotal !== targetTotal` → show `showSubmitDialog` (as before)

3. **Mark manual edits**: In `handlePriceChange` (line 470), set `hasManualEdits = true`. The initialization in `loadSession` (line 159) does NOT set this flag since it's pre-filling defaults.

This is a single-file change with minimal risk — only the submit button branching logic changes.


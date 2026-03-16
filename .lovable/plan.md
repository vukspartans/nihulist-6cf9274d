

# Fix: Optional Items Pre-Checked in Proposal Approval Dialog

## Root Cause

The `ProposalApprovalDialog` currently renders optional fee items as interactive checkboxes that can be toggled. While the state initializes as empty (`new Set()`), re-renders or state persistence can cause items to appear checked. More fundamentally, per the existing design spec, optional items should be a **static reference price list** — not interactive checkboxes.

## Fix — 1 file

### `src/components/ProposalApprovalDialog.tsx`

Replace the interactive optional items section (lines ~316-379) with a static, non-interactive display:

1. **Remove** `selectedOptionalItems` state, `toggleOptionalItem` function, and `selectedOptionalTotal` calculation entirely
2. **Remove** all checkbox components and `onClick`/`onCheckedChange` handlers from optional items
3. **Replace** the section header from "פריטים נוספים לבחירה" (Additional items to select) → "מחירון שירותים אופציונליים" (Optional services price list)
4. **Add** a small note: "שימוש ותשלום בהתאם להסכם" (Usage and payment per the agreement)
5. **Remove** the "סה"כ אופציונלי נבחר" (Selected optional total) row from the price summary
6. **Grand total** = mandatory total only (no optional contribution)

This eliminates the bug entirely — no checkboxes means nothing can be pre-checked — and aligns with the intended design where optional items are informational only.

## Files Modified: 1
- `src/components/ProposalApprovalDialog.tsx`


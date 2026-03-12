

# Fix: Payment Milestones Validation and UI in NegotiationResponseView

## Problem Summary
The advisor-side milestone response table (`NegotiationResponseView.tsx`) allows percentages to exceed 100%, has inconsistent validation, lacks proper visual cues (delta arrows, gold highlighting, remaining % indicator), and the footer row doesn't turn fully red when invalid.

The entrepreneur-side table (`MilestoneNegotiationTable.tsx`) also needs a "remaining %" indicator and the footer row styling improvement.

## Changes

### File 1: `src/components/negotiation/NegotiationResponseView.tsx`

**1a. Fix validation tolerance** (line 604)
Change strict `=== 100` to tolerance-based check matching the NegotiationDialog pattern:
```typescript
const isMilestoneResponseValid = Math.abs(milestoneResponseTotal - 100) < 0.01;
```

**1b. Add "Remaining %" counter below table** (after line 1425)
Add a real-time indicator showing remaining percentage when total is not 100%:
```tsx
{canRespond && milestoneResponseTotal !== 100 && (
  <div className="text-sm font-medium text-center py-2">
    נותרו: <span className={milestoneResponseTotal > 100 ? "text-destructive" : "text-amber-600"}>
      {(100 - milestoneResponseTotal).toFixed(1)}%
    </span>
  </div>
)}
```

**1c. Make entire footer row red when invalid** (line 1386)
Update the footer `<TableRow>` to have a red background when invalid:
```tsx
<TableRow className={cn("font-bold", !isMilestoneResponseValid && milestoneResponses.length > 0 && "bg-red-50")}>
```

**1d. Gold/yellow background for "Requested" column header and cells**
- Line 1301-1305: Add `bg-amber-50` to the "יזם (מבוקש)" `<TableHead>`
- Line 1331: Add `bg-amber-50/30` to the entrepreneur percentage `<TableCell>`

**1e. Ensure delta column uses correct arrows** — Already correct (lines 1340-1350 have green `ArrowUp` for increases, red `ArrowDown` for decreases). No change needed.

**1f. Add `cn` import** — Already imported at line level via `@/lib/utils`. Confirmed.

### File 2: `src/components/negotiation/MilestoneNegotiationTable.tsx`

**2a. Add "Remaining %" indicator** (after line 158, inside the alert section)
Show remaining percentage when adjustments exist and total is not 100%:
```tsx
{adjustments.length > 0 && !isValidTotal && (
  <div className="text-sm font-medium text-center py-1">
    נותרו: <span className={totals.targetTotal > 100 ? "text-destructive" : "text-amber-600"}>
      {(100 - totals.targetTotal).toFixed(1)}%
    </span>
  </div>
)}
```

**2b. Make entire footer row red when invalid** (line 252)
```tsx
<TableRow className={cn("bg-muted/30", !isValidTotal && adjustments.length > 0 && "bg-red-50")}>
```

**2c. Add delta/change column** between "אחוז יעד" and "סכום יעד"
Add a new `<TableHead>` for "שינוי" and corresponding cells showing green up-arrow or red down-arrow when selected and percentage differs from original.

## What is NOT changed
- Badge rendering at top of view — this requires understanding the specific "Notion reference" layout. The current view already renders status badges. If a specific layout is needed, the user should provide the reference.
- Input masking to prevent >100% — instead of hard-blocking input (which creates UX confusion with multi-field edits), we use the "Remaining %" counter + red footer + disabled submit button approach, which is the standard pattern already used in `NegotiationDialog.tsx`.

## Files modified: 2
- `src/components/negotiation/NegotiationResponseView.tsx` — validation fix, gold styling, remaining % counter, red footer
- `src/components/negotiation/MilestoneNegotiationTable.tsx` — remaining % counter, red footer, delta column


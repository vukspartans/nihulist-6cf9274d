

# Compact the Advanced Filter Panel

## Problem
The filter panel (lines 229-291) uses a `grid-cols-2 md:grid-cols-4` layout inside a full `Card` with `p-4`, which takes excessive vertical space — especially on smaller screens where it stacks into 2 columns showing 5 filter groups + checkbox row. The image confirms it dominates the viewport.

## Solution
Restructure the filter panel into a single compact horizontal strip that wraps naturally, removing the Card wrapper and using inline flex layout instead of grid.

### Changes to `src/pages/AccountantDashboard.tsx` (lines 228-291)

**Replace** the Card-wrapped grid layout with a compact, border-based collapsible strip:

1. **Remove `<Card className="p-4">`** wrapper — replace with a simple `div` with `border rounded-md p-3`
2. **Change layout** from `grid grid-cols-2 md:grid-cols-4 gap-3` to `flex flex-wrap items-end gap-2` — all filters sit inline and wrap naturally
3. **Remove `<Label>` elements** — use placeholder text inside each control instead (the labels like "פרויקט", "יועץ" are redundant when placeholders already say "הכל")
4. **Shrink date inputs** — add `w-[120px]` to keep them compact
5. **Merge the amount range** into a single inline pair with no separate label
6. **Move "חריגות בלבד" checkbox and "נקה סינון" button** inline at the end of the flex row
7. **Remove `space-y-1` wrappers** and `col-span-2` — not needed in flex layout

The result: a single-row (on desktop) / 2-row (on mobile) compact filter strip that takes roughly 50% less vertical space.


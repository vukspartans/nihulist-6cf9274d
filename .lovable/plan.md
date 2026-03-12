

# Fix Broken Logo Images with Fallback

## Problem
The advisor "שי אילון אדריכות עיצוב" has a `logo_url` value stored in the database, but the actual image URL is broken (404, expired, or invalid). The current code uses a ternary: if `logo_url` is truthy, render `<img>`, otherwise render a letter-initial fallback. Since the URL string exists but the image fails to load, a broken image placeholder appears instead of the fallback.

## Solution
Add `onError` handlers to all `<img>` tags rendering advisor logos so that when an image fails to load, it hides itself and shows the letter-initial fallback instead.

## Changes

### `src/components/ProposalComparisonTable.tsx`

There are two places rendering advisor logos (desktop table ~line 287, mobile cards ~line 461). For both:

- Wrap the logo in a small component/pattern using state, or more simply: on `onError`, hide the broken `<img>` and replace it with the fallback div. The cleanest approach: use a local state pattern or just set `e.currentTarget.style.display = 'none'` and show the fallback sibling.

**Simplest approach**: Always render the fallback div, but hide it when the image loads successfully. Render the `<img>` with `onError` that hides itself and shows the fallback:

```tsx
{proposal.advisors?.logo_url && (
  <img 
    src={proposal.advisors.logo_url}
    alt=""
    className="w-8 h-8 rounded-full object-cover border"
    onError={(e) => {
      e.currentTarget.style.display = 'none';
      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
      if (fallback) fallback.style.display = 'flex';
    }}
  />
)}
<div 
  className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center border"
  style={{ display: proposal.advisors?.logo_url ? 'none' : 'flex' }}
>
  <span className="text-xs font-bold text-primary">
    {(proposal.advisors?.company_name || proposal.supplier_name).charAt(0)}
  </span>
</div>
```

Apply the same pattern at both locations (lines 287-299 and 461-473).

### Other components to audit for the same pattern

Search for other `logo_url` conditional renders without `onError`:
- `ProposalDetailDialog.tsx` — advisor logo display
- `AdvisorProposalViewDialog.tsx` — logo in header
- `SelectedAdvisorsTab.tsx` — advisor cards
- `ProposalComparisonDialog.tsx` — comparison view

All need the same `onError` fallback treatment.

| File | Change |
|------|--------|
| `src/components/ProposalComparisonTable.tsx` | Add `onError` fallback to 2 logo `<img>` tags |
| Other components with `logo_url` rendering | Same `onError` fallback pattern |




# Fix: Negotiate Button Still Available After Counter-Offer Received

## Problem
When an advisor responds to a negotiation (proposal becomes `resubmitted`), the `has_active_negotiation` flag is set to `false` by the database function. In the **ProposalComparisonDialog**, the negotiate button's disabled state only checks `has_active_negotiation`, so it becomes clickable again immediately — allowing the entrepreneur to start another negotiation without first reviewing the advisor's counter-offer.

The **ProposalDetailDialog** handles this correctly by checking for `responded` sessions, but the comparison dialog does not.

## Fix

### `src/components/ProposalComparisonDialog.tsx` (line ~980)
Disable the negotiate button when the proposal status is `resubmitted` (meaning there's an unreviewed counter-offer). The entrepreneur must open the proposal detail view to review the counter-offer first, where they can choose to accept, reject, or continue negotiating.

```tsx
// Before:
disabled={actionLoading || proposal.has_active_negotiation}

// After:
disabled={actionLoading || proposal.has_active_negotiation || proposal.status === 'resubmitted'}
```

Also update the tooltip to explain why it's disabled when status is `resubmitted`:

```tsx
<TooltipContent>
  {proposal.status === 'resubmitted' ? 'יש הצעה נגדית לצפייה' : 'בקש הצעה מחודשת'}
</TooltipContent>
```

### Files to change
| File | Change |
|------|--------|
| `src/components/ProposalComparisonDialog.tsx` | Add `status === 'resubmitted'` check to negotiate button disabled condition + update tooltip |

This is a 2-line change. The entrepreneur can still negotiate again — they just need to open the proposal detail first, review the counter-offer, and choose "continue negotiation" from there.


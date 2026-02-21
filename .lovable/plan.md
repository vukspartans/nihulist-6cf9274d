

# Fix: Milestone Changes Not Applied to Proposal During Negotiation

## Problem

When an entrepreneur changes milestone percentages during negotiation, the advisor sees the changes in the negotiation view, but **when the advisor responds, the updated milestones are NOT written back to the proposal**. The root cause is in the `send-negotiation-response` edge function.

## Root Cause Analysis

The data flow has a gap:

1. **Entrepreneur sends negotiation request** -- milestone adjustments are stored in `negotiation_sessions.milestone_adjustments` (correct)
2. **Advisor views negotiation** -- sees the entrepreneur's requested changes via `session.milestone_adjustments` merged with `proposal.milestone_adjustments` (correct)
3. **Advisor responds** -- the `send-negotiation-response` edge function calls the DB function `submit_negotiation_response` but **only passes 3 arguments**:
   - `p_session_id`
   - `p_updated_line_items`
   - `p_consultant_message`
4. The DB function signature accepts 5 args including `p_milestone_adjustments`, but since it's not passed, it defaults to `NULL`
5. The DB function then does: `COALESCE(p_milestone_adjustments, v_proposal.milestone_adjustments)` -- which falls back to the **original** proposal milestones (unchanged)

The `milestone_responses` from the advisor are only saved to `session.files.advisor_milestone_responses` (a JSON blob for display purposes) but never propagated to the actual `proposals.milestone_adjustments` column.

## Fix

### File: `supabase/functions/send-negotiation-response/index.ts`

**Change 1**: Convert the advisor's `milestone_responses` into the format expected by the DB function (`p_milestone_adjustments`), then pass it to the RPC call.

The advisor's milestone responses have this structure:
```typescript
{
  description: string;
  originalPercentage: number;
  entrepreneurPercentage: number;
  advisorResponsePercentage: number;  // <-- the advisor's final answer
  accepted: boolean;
}
```

The proposal's `milestone_adjustments` column stores:
```typescript
{
  description: string;
  entrepreneur_percentage: number;
  consultant_percentage: number;  // <-- this needs updating
  percentage?: number;
}
```

**Logic**: After milestone_responses are received, rebuild the `milestone_adjustments` array by reading the current proposal milestones and updating each one's `consultant_percentage` (and `percentage`) with the advisor's `advisorResponsePercentage`.

**Change 2**: Pass the rebuilt milestones to the RPC call:
```typescript
const { data: result, error: rpcError } = await supabase.rpc(
  "submit_negotiation_response",
  {
    p_session_id: session_id,
    p_updated_line_items: updated_line_items || [],
    p_consultant_message: consultant_message,
    p_milestone_adjustments: updatedMilestones || null,  // NEW
  }
);
```

**Change 3**: To build `updatedMilestones`, fetch the current proposal's `milestone_adjustments` from the DB (already available via `session.proposal`), then merge with the advisor's responses:

```typescript
let updatedMilestones = null;
if (milestone_responses && milestone_responses.length > 0) {
  // Fetch current proposal milestones
  const { data: proposalFull } = await supabase
    .from("proposals")
    .select("milestone_adjustments")
    .eq("id", proposalData.id)
    .single();

  const currentMilestones = proposalFull?.milestone_adjustments || [];

  if (Array.isArray(currentMilestones)) {
    updatedMilestones = currentMilestones.map((m, idx) => {
      // Find matching response by description
      const response = milestone_responses.find(
        r => r.description === m.description
      );
      if (response) {
        return {
          ...m,
          consultant_percentage: response.advisorResponsePercentage,
          percentage: response.advisorResponsePercentage,
        };
      }
      return m;
    });
  }
}
```

### Also in `supabase/functions/send-negotiation-response/index.ts`

The RPC call on line 130-137 currently only passes 3 params. Update to pass 5 params (the DB function's full signature).

## Previous Plan Integration

The previously approved plan for showing all negotiations to consultants (removing the status filter on AdvisorDashboard line 467, adding negotiated price to proposal cards, skeleton loaders, empty states) will also be implemented in this same change set.

### File: `src/pages/AdvisorDashboard.tsx`

1. **Remove status filter** on line 467 (`.filter((n: any) => n.status === 'awaiting_response' || n.status === 'open')`) so responded/resolved negotiations remain visible to the consultant
2. **Add negotiated price display** on proposal cards using a `negotiatedPriceMap` built from negotiation sessions
3. **Add skeleton loaders** for each tab (RFP Invites, My Proposals, Negotiations)
4. **Improve empty states** with icons and guidance text
5. **Add console warning** when a proposal exists in data but is not rendered

---

## Summary of Changes

| File | Changes |
|------|---------|
| `supabase/functions/send-negotiation-response/index.ts` | Pass milestone responses to DB function as `p_milestone_adjustments` after converting format |
| `src/pages/AdvisorDashboard.tsx` | Remove negotiation status filter, show negotiated price on proposals, add skeleton loaders, improve empty states |

## Risk Assessment

- The DB function `submit_negotiation_response` already handles `p_milestone_adjustments` correctly (line 121: `COALESCE(p_milestone_adjustments, v_proposal.milestone_adjustments)`) -- no DB migration needed
- The edge function change is backward-compatible: if no milestone_responses are provided, `p_milestone_adjustments` stays `null` and the DB falls back to existing milestones
- The advisor dashboard changes are UI-only with no data impact


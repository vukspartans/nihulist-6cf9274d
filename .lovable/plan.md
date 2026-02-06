

# Fix: Remove Duplicate "במשא ומתן" Badge

## Problem

The RFP card shows two badges that indicate the same thing:
1. **ProposalStatusBadge**: Shows "משא ומתן" (orange, with MessageCircle icon) when proposal status is `negotiation_requested`
2. **New negotiation badge**: Shows "במשא ומתן" (amber, with Handshake icon) when there's an active negotiation session

This creates visual duplication as shown in the screenshot.

## Solution

Show the "במשא ומתן" badge ONLY when there's an active negotiation **AND** the ProposalStatusBadge isn't already showing a negotiation-related status.

## Implementation

### File: `src/pages/AdvisorDashboard.tsx`

**Change: Conditionally render the negotiation badge**

Current code (around line 1143-1149):
```tsx
{/* Show negotiation badge if there's an active negotiation */}
{negotiationByInvite.has(invite.id) && (
  <Badge className="bg-amber-100 text-amber-800 border border-amber-300 gap-1">
    <Handshake className="h-3 w-3" />
    במשא ומתן
  </Badge>
)}
```

Updated code - only show if proposal status doesn't already indicate negotiation:
```tsx
{/* Show negotiation badge ONLY if there's an active negotiation 
    AND proposal status isn't already showing negotiation status */}
{negotiationByInvite.has(invite.id) && 
 proposalMap.get(invite.id)?.status !== 'negotiation_requested' && (
  <Badge className="bg-amber-100 text-amber-800 border border-amber-300 gap-1">
    <Handshake className="h-3 w-3" />
    במשא ומתן
  </Badge>
)}
```

This ensures:
- If proposal status is `negotiation_requested`, the ProposalStatusBadge shows "משא ומתן" and our new badge is hidden
- If there's an active negotiation but proposal status is different (edge case), the "במשא ומתן" badge still appears
- No duplication in any scenario

## Testing Checklist

1. Login as `lior+sapak2@spartans.tech`
2. Navigate to "הזמנות להצעת מחיר" tab
3. Verify only ONE negotiation badge appears (the orange "משא ומתן")
4. Verify the "מעבר למשא ומתן" button still appears correctly
5. Click the button and verify navigation works


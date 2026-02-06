

# Plan: RFP Invite Visibility During Active Negotiations

## Problem Summary

When an RFP has an active negotiation session, the invite disappears from the "הזמנות להצעת מחיר" (RFP Invites) tab if the deadline passes. This creates a confusing experience where:
- The vendor can see the project in "משא ומתן" (Negotiations) tab
- But the same project is hidden from "הזמנות להצעת מחיר" tab
- There's no clear link between the two views

**Specific Example Found:**
- Project: "ז'בוטינסקי 63, גבעתיים"
- Invite deadline passed: 2026-01-17
- Proposal status: `negotiation_requested`
- Active negotiation session: `awaiting_response`
- Result: Hidden from RFP Invites because deadline passed

## Solution

### Part 1: Keep RFPs with Active Negotiations Visible

Modify the `isInactiveInvite()` function to consider negotiation status. An invite should **NOT** be marked inactive if:
- There's a submitted proposal with `has_active_negotiation = true`, OR
- There's an active negotiation session (`status = 'awaiting_response'`)

```text
Current Logic:
┌─────────────────────────────────┐
│ isInactiveInvite = true if:    │
│ • status = 'declined' OR       │
│ • status = 'expired' OR        │
│ • deadline_at < now()          │
└─────────────────────────────────┘

New Logic:
┌─────────────────────────────────────────────────────────┐
│ isInactiveInvite = true if:                            │
│ • status = 'declined' OR                               │
│ • status = 'expired' OR                                │
│ • (deadline_at < now() AND NOT hasActiveNegotiation()) │
└─────────────────────────────────────────────────────────┘
```

### Part 2: Add Negotiation Badge to RFP Cards

Add a visual indicator on RFP invite cards when there's an active negotiation:
- Show "במשא ומתן" (In Negotiation) badge
- Badge uses amber/orange styling to draw attention

### Part 3: Add "Go to Negotiation" Button

Add a button on RFP invite cards that links directly to the negotiation page when:
- The proposal has `has_active_negotiation = true`
- There's an active negotiation session for this proposal

## Implementation Details

### File: `src/pages/AdvisorDashboard.tsx`

**Change 1: Fetch negotiation data and link to invites**

Currently, the dashboard fetches proposals and negotiations separately. We need to create a mapping from `rfp_invite_id` to negotiation sessions.

```typescript
// Add: Create map of invite ID -> active negotiation session
const [negotiationByInvite, setNegotiationByInvite] = useState<Map<string, NegotiationItem>>(new Map());

// In fetchAdvisorData, after fetching negotiations:
const negotiationInviteMap = new Map<string, NegotiationItem>();
mappedNegotiations.forEach(neg => {
  // Find the invite ID for this negotiation's proposal
  const proposal = proposalData?.find(p => p.id === neg.proposal_id);
  if (proposal?.rfp_invite_id) {
    negotiationInviteMap.set(proposal.rfp_invite_id, neg);
  }
});
setNegotiationByInvite(negotiationInviteMap);
```

**Change 2: Update `isInactiveInvite()` function**

```typescript
// Enhanced check: consider active negotiations
const isInactiveInvite = (invite: RFPInvite) => {
  if (['declined', 'expired'].includes(invite.status)) return true;
  
  // Check if there's an active negotiation for this invite
  const hasActiveNegotiation = negotiationByInvite.has(invite.id);
  
  // If deadline passed but there's an active negotiation, keep it active
  if (invite.deadline_at && new Date(invite.deadline_at) < new Date()) {
    return !hasActiveNegotiation;
  }
  
  return false;
};
```

**Change 3: Add negotiation badge and button to RFP card**

In the RFP invite card rendering section (around line 1080-1240):

```tsx
{/* Add negotiation badge next to status */}
{negotiationByInvite.has(invite.id) && (
  <Badge className="bg-amber-100 text-amber-800 border border-amber-300 gap-1">
    <Handshake className="h-3 w-3" />
    במשא ומתן
  </Badge>
)}

{/* Add "Go to Negotiation" button in the actions section */}
{negotiationByInvite.has(invite.id) && (
  <Button 
    className="bg-amber-500 hover:bg-amber-600 text-white"
    onClick={() => navigate(`/negotiation/${negotiationByInvite.get(invite.id)!.id}`)}
  >
    <Handshake className="h-4 w-4 me-2" />
    מעבר למשא ומתן
  </Button>
)}
```

### Part 4: Update Expire Function (Database)

Update the `expire_old_rfp_invites` database function to skip invites that have active negotiations:

```sql
CREATE OR REPLACE FUNCTION public.expire_old_rfp_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.rfp_invites ri
  SET status = 'expired'::public.rfp_invite_status
  WHERE ri.status IN ('pending', 'sent', 'opened')
    AND ri.deadline_at < now()
    AND ri.deadline_at IS NOT NULL
    -- NEW: Don't expire if there's an active negotiation
    AND NOT EXISTS (
      SELECT 1 
      FROM proposals p
      JOIN negotiation_sessions ns ON ns.proposal_id = p.id
      WHERE p.rfp_invite_id = ri.id
        AND ns.status = 'awaiting_response'
    );
END;
$$;
```

## Summary of Changes

| Component | Change |
|-----------|--------|
| `AdvisorDashboard.tsx` | Track negotiation by invite ID mapping |
| `AdvisorDashboard.tsx` | Update `isInactiveInvite()` to consider negotiations |
| `AdvisorDashboard.tsx` | Add "במשא ומתן" badge to cards |
| `AdvisorDashboard.tsx` | Add "מעבר למשא ומתן" button |
| `expire_old_rfp_invites` | Skip expiring invites with active negotiations |

## Testing Checklist

1. Login as `lior+sapak2@spartans.tech`
2. Navigate to "הזמנות להצעת מחיר" tab
3. Verify the "ז'בוטינסקי 63, גבעתיים" project is now visible
4. Verify it shows "במשא ומתן" badge
5. Click "מעבר למשא ומתן" button
6. Verify it navigates to the negotiation page
7. Toggle to "הצג הכל" and verify all invites display correctly
8. Verify that truly expired RFPs (no negotiation) still show as inactive


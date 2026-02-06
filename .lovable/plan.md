


# Plan: RFP Invite Visibility During Active Negotiations

## ✅ IMPLEMENTED

### Summary
Fixed the issue where RFP invites with active negotiations were disappearing from the "הזמנות להצעת מחיר" tab after the deadline passed.

### Changes Made

1. **AdvisorDashboard.tsx** - Updated `isInactiveInvite()` to consider active negotiations
2. **AdvisorDashboard.tsx** - Added `negotiationByInvite` state to map invite IDs to negotiation sessions
3. **AdvisorDashboard.tsx** - Added "במשא ומתן" amber badge to RFP cards with active negotiations
4. **AdvisorDashboard.tsx** - Added "מעבר למשא ומתן" button to navigate directly to negotiation page
5. **Database** - Updated `expire_old_rfp_invites()` function to skip invites with active negotiations

### Testing Checklist

1. Login as `lior+sapak2@spartans.tech`
2. Navigate to "הזמנות להצעת מחיר" tab
3. Verify the "וולפסון 12-18, חולון" project is now visible (if it has active negotiation)
4. Verify it shows "במשא ומתן" badge
5. Click "מעבר למשא ומתן" button
6. Verify it navigates to the negotiation page
7. Toggle to "הצג הכל" and verify all invites display correctly
8. Verify that truly expired RFPs (no negotiation) still show as inactive

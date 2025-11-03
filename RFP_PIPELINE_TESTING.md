# RFP Pipeline Testing Protocol

## Overview
This document outlines the testing procedures for the complete RFP (Request for Proposal) pipeline after implementing all fixes (Phases 1-6).

## Phase 1-5 Implementation Summary

### ✅ Phase 1: Placeholder Replacement (COMPLETED)
- **Database Function Updated**: `send_rfp_invitations_to_advisors`
- **Changes**: Replaces `{{שם_הפרויקט}}` with actual project name and `{{שם_המשרד}}` with advisor company name
- **Expected Outcome**: RFP subject and body display actual project/company names instead of placeholders

### ✅ Phase 2: Label Fix (COMPLETED)
- **File Updated**: `src/components/SentRFPsTab.tsx`
- **Changes**: Badge now shows "X הצעות" (proposals received) instead of "X הזמנות" (invites sent)
- **Expected Outcome**: Displays proposal count, not invite count

### ✅ Phase 3: Debug Zero RFP Invites (COMPLETED)
- **Database Function**: Added comprehensive `RAISE NOTICE` logging
- **Frontend Logging**: Added console.log statements in:
  - `useRFP.tsx` - logs advisor IDs and results
  - `RFPWizard.tsx` - logs complete RFP send operation
- **Validation**: Added check for empty advisor selection in `useRFP.tsx`
- **Expected Outcome**: Console logs reveal exact point of failure when invites aren't created

### ✅ Phase 4: Database Constraint (SKIPPED)
- **Reason**: CHECK constraints could cause issues with existing data
- **Alternative**: Validation handled in application layer (Phase 3)

### ✅ Phase 5: UI Improvements (COMPLETED)
- **File Updated**: `src/components/SentRFPsTab.tsx`
- **Changes**: Added yellow warning banner when RFPs have 0 invites
- **Expected Outcome**: Clear visual feedback to entrepreneurs when invites fail

---

## Testing Protocol

### Test Case 1: Send New RFP with Advisor Selection

**Prerequisites**:
- Logged in as entrepreneur
- Project exists: "גליקסברג 9 ת״א" (ID: `e7bb78fe-04d8-4fb8-b87e-f778c18f5ef2`)
- At least one active, admin-approved advisor exists

**Steps**:
1. Navigate to project detail page
2. Open RFP Wizard
3. **Step 1**: Verify/select project type
4. **Step 2**: Select advisor type (e.g., "אדריכל")
5. **Step 3**: Select specific advisor (e.g., "מקדונלד")
   - **Important**: Verify advisor ID appears in `selectedRecommendedAdvisors`
6. **Step 4**: Review RFP content
   - **Verify**: Subject shows actual project name (not `{{שם_הפרויקט}}`)
   - **Verify**: Email body shows actual project name
7. Click "שלח הצעות מחיר"

**Expected Console Output**:
```javascript
[RFPWizard] Sending RFP: {
  projectId: "e7bb78fe-04d8-4fb8-b87e-f778c18f5ef2",
  projectName: "גליקסברג 9 ת״א",
  advisorIds: ["d776edc7-b9f9-42a7-8317-4aefb9adfd94"],
  advisorCount: 1,
  ...
}

[useRFP] Sending RFP to advisors: {
  projectId: "e7bb78fe-04d8-4fb8-b87e-f778c18f5ef2",
  advisorIds: ["d776edc7-b9f9-42a7-8317-4aefb9adfd94"],
  count: 1,
  ...
}

[useRFP] RFP Result: {
  rfp_id: "...",
  invites_sent: 1
}
```

**Database Verification**:
```sql
-- Check RFP created
SELECT id, subject, body_html FROM rfps 
WHERE project_id = 'e7bb78fe-04d8-4fb8-b87e-f778c18f5ef2'
ORDER BY sent_at DESC LIMIT 1;

-- Check invite created
SELECT * FROM rfp_invites 
WHERE advisor_id = 'd776edc7-b9f9-42a7-8317-4aefb9adfd94'
ORDER BY created_at DESC LIMIT 1;

-- Verify subject has actual project name
SELECT subject FROM rfps WHERE subject LIKE '%גליקסברג 9 ת״א%';
```

**Expected Results**:
- ✅ Toast shows: "הזמנות נשלחו ל-1 יועצים"
- ✅ RFP record created with replaced placeholders
- ✅ `rfp_invites` record created with status 'sent'
- ✅ `personalized_body_html` contains actual company name

---

### Test Case 2: Advisor Receives and Views RFP

**Prerequisites**:
- RFP sent to advisor (Test Case 1 completed)
- Advisor login credentials available

**Steps**:
1. Logout entrepreneur account
2. Login as advisor (email: `lior+sapak2@spartans.tech`)
3. Navigate to Advisor Dashboard
4. Go to "בקשות פתוחות" tab

**Expected Results**:
- ✅ RFP appears in open requests list
- ✅ Project name shows as "גליקסברג 9 ת״א" (not placeholder)
- ✅ Deadline displayed correctly
- ✅ Can click "View RFP" and see full details

**Additional Checks**:
5. Click "Submit Proposal"
6. Fill proposal form
7. Submit proposal

**Database Verification**:
```sql
-- Check proposal created
SELECT * FROM proposals 
WHERE project_id = 'e7bb78fe-04d8-4fb8-b87e-f778c18f5ef2'
AND advisor_id = 'd776edc7-b9f9-42a7-8317-4aefb9adfd94';
```

**Expected Results**:
- ✅ Proposal submitted successfully
- ✅ Status = 'submitted'
- ✅ `rfp_invites.status` updated to 'responded'

---

### Test Case 3: Entrepreneur Views Proposals

**Prerequisites**:
- RFP sent (Test Case 1)
- At least 1 proposal submitted (Test Case 2)

**Steps**:
1. Login as entrepreneur
2. Navigate to project detail
3. Go to "בקשות להצעות מחיר נשלחו" tab

**Expected Results**:
- ✅ RFP appears in list
- ✅ Subject shows actual project name
- ✅ **Badge shows "1 הצעות"** (not "1 הזמנות")
- ✅ Click accordion to expand
- ✅ Table row shows:
  - Advisor type: "אדריכל"
  - Invites sent: 1
  - Proposals received: **1/1**
  - Status: badge with appropriate color
  - "השווה הצעות (1)" button enabled

**Additional Checks**:
4. Click "השווה הצעות" button
5. Proposal comparison dialog opens
6. View proposal details

**Expected Results**:
- ✅ Proposal details displayed
- ✅ Price, timeline, scope visible
- ✅ Can approve or reject proposal

---

### Test Case 4: Zero Invites Warning (Edge Case)

**Scenario**: Simulate RFP with 0 invites sent

**Steps**:
1. Manually create RFP without invites (via SQL or edge case):
```sql
INSERT INTO rfps (project_id, subject, body_html, sent_by)
VALUES (
  'e7bb78fe-04d8-4fb8-b87e-f778c18f5ef2',
  'Test RFP',
  '<p>Test</p>',
  auth.uid()
);
```

2. Navigate to "בקשות להצעות מחיר נשלחו" tab

**Expected Results**:
- ✅ **Yellow warning banner appears** at top:
  - Icon: AlertCircle
  - Text: "חלק מהבקשות לא נשלחו ליועצים"
  - Subtext: "ייתכן שהבעיה היא בתהליך שליחת ההזמנות..."
- ✅ RFP shows "0 הצעות" in badge
- ✅ Accordion shows "אין הצעות" in actions column

---

### Test Case 5: Edge Function Logs Review

**Purpose**: Verify comprehensive logging works

**Steps**:
1. Send RFP (Test Case 1)
2. Open Supabase Dashboard
3. Navigate to Edge Functions → Logs
4. Filter for recent activity

**Expected Log Output**:
```
NOTICE: Project found: גליקסברג 9 ת״א, Owner: ...
NOTICE: Advisor list: {d776edc7-b9f9-42a7-8317-4aefb9adfd94}, Count: 1
NOTICE: Starting advisor loop with 1 advisors
NOTICE: Processing advisor: מקדונלד (d776edc7-...), Email: lior+sapak2@spartans.tech
NOTICE: Total invites created: 1
```

**If Zero Invites**:
```
WARNING: No RFP invites were created - check if advisors exist and are active
```

---

## Common Issues & Troubleshooting

### Issue 1: No Invites Created (`invites_sent: 0`)

**Root Causes**:
1. **Advisor not active**: Check `advisors.is_active = true`
2. **Advisor not admin approved**: Check `profiles.admin_approved = true`
3. **Empty advisor selection**: Check frontend logs for `advisorIds` array
4. **Profile missing**: Advisor has no matching profile record

**Debugging Steps**:
```sql
-- Check advisor status
SELECT 
  a.id, a.is_active, a.company_name,
  p.admin_approved, p.email
FROM advisors a
LEFT JOIN profiles p ON p.user_id = a.user_id
WHERE a.id = 'd776edc7-b9f9-42a7-8317-4aefb9adfd94';
```

**Console Checks**:
- Look for `[useRFP] Sending RFP to advisors` log
- Verify `count` is > 0
- Check for validation error toast

---

### Issue 2: Placeholders Still Visible

**Root Cause**: Database function not updated or cached

**Fix**:
1. Verify migration was applied successfully
2. Check `rfps.subject` and `rfps.body_html` in database
3. Clear browser cache
4. Re-send RFP

**Verification**:
```sql
SELECT subject, body_html FROM rfps
WHERE subject LIKE '%{{%}}%' OR body_html LIKE '%{{%}}%';
```
Should return 0 results for new RFPs.

---

### Issue 3: "הזמנות" Label Still Showing

**Root Cause**: Frontend code not updated

**Fix**:
1. Verify `src/components/SentRFPsTab.tsx` has Phase 2 changes
2. Clear browser cache / hard refresh (Ctrl+Shift+R)
3. Check for TypeScript/build errors

**Code Check**:
```typescript
// Should be:
{rfp.advisorTypes.reduce((sum, type) => sum + type.proposalsReceived, 0)} הצעות

// NOT:
{rfp.advisorTypes.reduce((sum, type) => sum + type.invitesSent, 0)} הזמנות
```

---

## Success Metrics

After all tests pass:

- [x] **Phase 1**: RFP subject = "בקשה להצעת מחיר גליקסברג 9 ת״א"
- [x] **Phase 1**: Email body contains "גליקסברג 9 ת״א" and "מקדונלד"
- [x] **Phase 2**: Badge shows "1 הצעות" when 1 proposal received
- [x] **Phase 3**: Console logs show advisor IDs and invite count
- [x] **Phase 3**: Toast warns when `invites_sent: 0`
- [x] **Phase 5**: Yellow warning appears for RFPs with 0 invites
- [x] **Database**: `rfp_invites` table has records
- [x] **Database**: Foreign key relationships intact
- [x] **Advisor**: Can view and respond to RFP
- [x] **Entrepreneur**: Can see proposal count update

---

## Next Steps

1. **Run all test cases** in sequence
2. **Document any failures** with screenshots and logs
3. **Verify database state** after each test
4. **Check edge function logs** for NOTICE/WARNING messages
5. **Test with multiple advisors** (scale test)
6. **Test deadline expiry** flow

---

## Links

- [Supabase Edge Function Logs](https://supabase.com/dashboard/project/aazakceyruefejeyhkbk/functions)
- [Database Tables](https://supabase.com/dashboard/project/aazakceyruefejeyhkbk/editor)
- [RLS Policies](https://supabase.com/dashboard/project/aazakceyruefejeyhkbk/auth/policies)

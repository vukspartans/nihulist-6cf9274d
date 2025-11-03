# RFP System - Testing & Validation Guide

## Overview
This guide covers end-to-end testing scenarios for the RFP (Request for Proposal) system after the comprehensive production readiness update.

---

## Phase 1: RFP Creation & Sending

### Test 1.1: Happy Path - Complete RFP Flow
**Goal**: Verify RFPs are created and invitations are sent correctly

**Steps**:
1. Login as entrepreneur
2. Navigate to Projects → Create New Project
3. Fill project details:
   - Name: "Test Project ABC"
   - Type: "תמ"א 38/2 – הריסה ובנייה מחדש"
   - Location: "תל אביב"
   - Budget: 5,000,000
4. Go to Project Details → Send RFP
5. Use RFP Wizard:
   - Step 1: Confirm project type
   - Step 2: Select advisors in phases (אדריכל, מודד מוסמך)
   - Step 3: Review recommendations
   - Step 4: Edit RFP content (optional)
6. Click "Send RFP"

**Expected Results**:
- ✅ RFP record created in `rfps` table
- ✅ Invitation records created in `rfp_invites` table (one per advisor)
- ✅ `deadline_at` field populated (now() + 7 days by default)
- ✅ Toast notification: "הזמנות נשלחו ל-X יועצים"
- ✅ Success screen displayed

**Validation Queries**:
```sql
-- Check RFP was created
SELECT id, project_id, subject, sent_at 
FROM rfps 
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY sent_at DESC 
LIMIT 1;

-- Check invitations were sent
SELECT 
  ri.id,
  ri.advisor_id,
  ri.status,
  ri.deadline_at,
  a.company_name
FROM rfp_invites ri
LEFT JOIN advisors a ON a.id = ri.advisor_id
WHERE ri.rfp_id = 'YOUR_RFP_ID';
```

---

### Test 1.2: Custom Deadline
**Goal**: Verify custom deadline can be set

**Steps**:
1. Follow Test 1.1 steps 1-5
2. In code (for now), change deadline from 168 hours to 24 hours
3. Send RFP

**Expected Results**:
- ✅ `deadline_at` = now() + 24 hours
- ✅ Deadline countdown shows "24 שעות" or "1 ימים"

---

## Phase 2: Advisor Views & Responds to RFP

### Test 2.1: Advisor Sees RFP Invitation
**Goal**: Verify advisor can view RFP details

**Steps**:
1. Logout and login as advisor (use one of the invited advisor accounts)
2. Navigate to Advisor Dashboard
3. Check "Pending RFPs" tab

**Expected Results**:
- ✅ RFP invitation appears in list
- ✅ Status badge shows "נשלח" (sent)
- ✅ Click "View Details" → RFP details page loads

**Validation Query**:
```sql
-- Check advisor's pending RFPs
SELECT 
  r.id,
  r.subject,
  ri.status,
  ri.deadline_at,
  p.name as project_name
FROM rfp_invites ri
JOIN rfps r ON r.id = ri.rfp_id
JOIN projects p ON p.id = r.project_id
WHERE ri.advisor_id IN (
  SELECT id FROM advisors WHERE user_id = auth.uid()
)
AND ri.status IN ('sent', 'opened')
ORDER BY ri.created_at DESC;
```

---

### Test 2.2: RFP Opened Tracking
**Goal**: Verify `opened_at` timestamp is recorded

**Steps**:
1. As advisor, click "View RFP" from dashboard
2. RFP details page loads

**Expected Results**:
- ✅ `rfp_invites.opened_at` field updated to current timestamp
- ✅ `rfp_invites.status` changed to 'opened'
- ✅ Deadline countdown component displayed (if within deadline)

**Validation Query**:
```sql
SELECT 
  id,
  status,
  opened_at,
  created_at,
  EXTRACT(EPOCH FROM (opened_at - created_at))/60 as minutes_to_open
FROM rfp_invites
WHERE advisor_id = 'YOUR_ADVISOR_ID'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Test 2.3: Deadline Countdown Display
**Goal**: Verify deadline countdown shows correct time

**Steps**:
1. As advisor viewing RFP
2. Check deadline countdown component

**Expected Results**:
- ✅ If > 2 days remaining: Shows days count (e.g., "5 ימים")
- ✅ If < 2 days remaining: Shows yellow/orange alert
- ✅ If < 24 hours remaining: Shows red urgent alert with hours
- ✅ If expired: Shows "פג תוקף" message with AlertTriangle icon

---

### Test 2.4: Submit Proposal
**Goal**: Verify proposal submission works end-to-end

**Steps**:
1. As advisor on RFP details page
2. Click "Submit Proposal" button
3. Fill proposal form:
   - Price: 150,000
   - Timeline: 90 days
   - Scope: "פירוק מבנה קיים, תכנון מבנה חדש..."
   - Upload 2 files (PDF, Excel)
4. Sign proposal digitally
5. Submit

**Expected Results**:
- ✅ Signature validation passes (non-empty signature data)
- ✅ Proposal record created in `proposals` table
- ✅ `proposals.project_id` is NOT NULL
- ✅ `proposals.advisor_id` matches current advisor
- ✅ `proposals.status` = 'submitted'
- ✅ `signatures` table has new signature record
- ✅ `activity_log` has 'proposal_submitted' event
- ✅ Toast notification: "הצעה נשלחה בהצלחה"

**Validation Queries**:
```sql
-- Check proposal was created correctly
SELECT 
  p.id,
  p.project_id,
  p.advisor_id,
  p.supplier_name,
  p.price,
  p.timeline_days,
  p.status,
  p.submitted_at,
  p.files
FROM proposals p
WHERE p.advisor_id = 'YOUR_ADVISOR_ID'
ORDER BY p.submitted_at DESC
LIMIT 1;

-- Check signature was captured
SELECT 
  s.id,
  s.entity_type,
  s.entity_id,
  s.signer_user_id,
  s.signed_at,
  LENGTH(s.sign_png) as signature_length
FROM signatures s
WHERE s.entity_type = 'proposal'
ORDER BY s.signed_at DESC
LIMIT 1;

-- Check activity log
SELECT * FROM activity_log
WHERE action = 'proposal_submitted'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Phase 3: Proposal Review & Approval

### Test 3.1: Entrepreneur Views Proposals
**Goal**: Verify entrepreneur can see all submitted proposals

**Steps**:
1. Login as entrepreneur
2. Navigate to Project Details
3. Go to "Received Proposals" tab

**Expected Results**:
- ✅ All submitted proposals displayed
- ✅ Proposal details visible (supplier, price, timeline)
- ✅ "Compare Proposals" button enabled (if 2+ proposals)
- ✅ Individual "View Details" buttons work

---

### Test 3.2: Compare Proposals Side-by-Side
**Goal**: Verify proposal comparison dialog works

**Steps**:
1. As entrepreneur on Project Details
2. Click "Compare Proposals"
3. Comparison dialog opens

**Expected Results**:
- ✅ All proposals listed in table
- ✅ Best price highlighted with green badge
- ✅ Best timeline highlighted with blue badge
- ✅ Files column shows attachment links (clickable)
- ✅ Status badges correct colors
- ✅ Actions (Approve/Reject) only for 'submitted' status

---

### Test 3.3: Approve Proposal with Signature
**Goal**: Verify full approval workflow with validation

**Steps**:
1. In comparison dialog, click "Approve" on a proposal
2. Approval dialog opens (Step 1: Notes)
3. **Test validation**: Try clicking "Next" WITHOUT adding notes
   - Expected: Error toast "הערות חסרות"
4. Add notes: "אושר לביצוע, נא להתחיל בתיאום פגישת קיק-אוף"
5. Click "Next to Signature"
6. Approval dialog shows signature step
7. **Test validation**: Try clicking "Approve" WITHOUT signing
   - Expected: Error toast "חתימה חסרה"
8. Sign digitally
9. Click "Approve Proposal"

**Expected Results**:
- ✅ Validation errors shown for missing notes
- ✅ Validation errors shown for missing signature
- ✅ After signature: `proposals.status` updated to 'accepted'
- ✅ `project_advisors` entry created
- ✅ Entrepreneur signature saved to `signatures` table
- ✅ Activity log has 'proposal_approved' event
- ✅ Toast: "הצעה אושרה בהצלחה"
- ✅ Dialog closes
- ✅ Proposal status badge changes to "אושר"

**Validation Queries**:
```sql
-- Check proposal status updated
SELECT id, status, updated_at
FROM proposals
WHERE id = 'YOUR_PROPOSAL_ID';

-- Check project_advisor created
SELECT 
  pa.id,
  pa.project_id,
  pa.advisor_id,
  pa.fee_amount,
  pa.status,
  pa.selected_at,
  pa.notes
FROM project_advisors pa
WHERE pa.proposal_id = 'YOUR_PROPOSAL_ID';

-- Check entrepreneur signature
SELECT 
  s.id,
  s.entity_type,
  s.entity_id,
  s.signer_user_id,
  s.signed_at
FROM signatures s
WHERE s.entity_type = 'proposal_approval'
AND s.entity_id = 'YOUR_PROPOSAL_ID';

-- Check activity log
SELECT * FROM activity_log
WHERE action = 'proposal_approved'
AND entity_id = 'YOUR_PROPOSAL_ID';
```

---

### Test 3.4: Reject Proposal
**Goal**: Verify rejection workflow

**Steps**:
1. In comparison dialog, click "Reject" on a proposal
2. Add rejection reason (optional): "מחיר גבוה מדי"
3. Confirm rejection

**Expected Results**:
- ✅ `proposals.status` = 'rejected'
- ✅ Rejection reason saved in `proposals.terms` field
- ✅ Activity log has 'proposal_rejected' event
- ✅ Toast: "הצעה נדחתה"
- ✅ Status badge shows "נדחה" (red)

---

## Phase 4: Deadline Expiry

### Test 4.1: Automatic Expiry (Cron Job)
**Goal**: Verify expired RFPs are automatically marked

**Manual Test**:
1. Create RFP with 1-hour deadline (modify code temporarily)
2. Wait 61 minutes
3. Check database

**Expected Results**:
- ✅ `rfp_invites.status` changed from 'sent'/'opened' to 'expired'
- ✅ Advisor can no longer submit proposal

**Validation Query**:
```sql
-- Check expired invites
SELECT 
  id,
  status,
  deadline_at,
  now() as current_time,
  (deadline_at < now()) as should_be_expired
FROM rfp_invites
WHERE deadline_at IS NOT NULL 
AND deadline_at < now()
ORDER BY deadline_at DESC
LIMIT 10;
```

**Note**: Cron job runs every hour via edge function `expire-rfps`

---

## Phase 5: Error Handling

### Test 5.1: Missing Signature on Proposal Submission
**Steps**:
1. Try to submit proposal without signing
2. Click Submit

**Expected**: Error toast, submission blocked

---

### Test 5.2: Missing Signature on Approval
**Steps**:
1. Try to approve proposal without signing
2. Click Approve

**Expected**: Error toast "חתימה חסרה"

---

### Test 5.3: Missing Notes on Approval
**Steps**:
1. Try to approve proposal with empty notes field
2. Click Next

**Expected**: Error toast "הערות חסרות"

---

## Phase 6: Performance Testing

### Test 6.1: Send RFP to 20 Advisors
**Goal**: Verify system handles bulk invitations

**Steps**:
1. Select 20 advisors (if available)
2. Send RFP
3. Measure time

**Expected**:
- ✅ All 20 invites created in < 5 seconds
- ✅ No database errors
- ✅ Success message shows correct count

---

### Test 6.2: Multiple Simultaneous Proposals
**Goal**: Test concurrent submissions

**Steps**:
1. Have 5 advisors submit proposals at the same time
2. Monitor database

**Expected**:
- ✅ No deadlocks
- ✅ All proposals saved correctly
- ✅ No duplicate IDs

---

## Monitoring Queries

### Daily Health Check
```sql
SELECT 
  COUNT(DISTINCT r.id) as rfps_sent_today,
  COUNT(DISTINCT ri.id) as invites_sent_today,
  COUNT(DISTINCT p.id) as proposals_received_today,
  COUNT(DISTINCT pa.id) as advisors_approved_today
FROM rfps r
LEFT JOIN rfp_invites ri ON ri.rfp_id = r.id AND ri.created_at > now() - interval '24 hours'
LEFT JOIN proposals p ON p.created_at > now() - interval '24 hours'
LEFT JOIN project_advisors pa ON pa.selected_at > now() - interval '24 hours'
WHERE r.sent_at > now() - interval '24 hours';
```

### Conversion Funnel (Last 7 Days)
```sql
SELECT 
  'RFPs Sent' as stage, COUNT(*) as count
FROM rfps WHERE sent_at > now() - interval '7 days'
UNION ALL
SELECT 'Invites Sent', COUNT(*) 
FROM rfp_invites WHERE created_at > now() - interval '7 days'
UNION ALL
SELECT 'Proposals Submitted', COUNT(*) 
FROM proposals WHERE submitted_at > now() - interval '7 days'
UNION ALL
SELECT 'Proposals Approved', COUNT(*) 
FROM proposals 
WHERE status = 'accepted' AND submitted_at > now() - interval '7 days';
```

### Error Rate Monitoring
```sql
-- Check for proposals with null project_id (critical error)
SELECT COUNT(*) as orphaned_proposals
FROM proposals
WHERE project_id IS NULL;

-- Check for expired but not marked invites (cron job failure)
SELECT COUNT(*) as should_be_expired
FROM rfp_invites
WHERE deadline_at < now()
AND status NOT IN ('expired', 'declined', 'withdrawn');
```

---

## Success Criteria

### Immediate (Day 1)
- [ ] RFP sending creates rfp_invites records
- [ ] Advisors can see RFPs in dashboard
- [ ] Advisors can submit proposals
- [ ] Proposals saved with correct project_id
- [ ] Zero orphaned proposals (project_id NOT NULL)

### Week 1
- [ ] At least 5 proposals submitted successfully
- [ ] At least 1 proposal approved end-to-end
- [ ] Deadline countdown displays correctly
- [ ] Expired RFPs marked automatically
- [ ] Entrepreneur can view and compare proposals

### Week 2
- [ ] Conversion rate: RFPs → Proposals > 60%
- [ ] Average time to approve < 48 hours
- [ ] All signatures linked correctly
- [ ] No database errors in logs
- [ ] Performance targets met (< 5s for bulk operations)

---

## Rollback Plan

If critical issues occur:

1. **Immediate** (5 min):
   - Feature flag to disable proposal approval UI
   - Revert `useRFP.tsx` to old RPC function

2. **Database** (30 min):
   - Keep both old and new RPC functions active
   - No schema rollback needed (migrations are additive)

3. **Communication**:
   - Add system banner: "מערכת RFP זמנית לא זמינה"
   - Email affected users

---

## Post-Deployment Checklist

- [ ] Run all Phase 1-3 tests manually
- [ ] Check monitoring queries show healthy metrics
- [ ] Verify edge function logs show no errors
- [ ] Test on mobile devices (responsive design)
- [ ] Verify email notifications working (if implemented)
- [ ] Check Supabase dashboard for any RLS policy errors
- [ ] Run security linter and address any new warnings
- [ ] Update project documentation
- [ ] Train support team on new workflow

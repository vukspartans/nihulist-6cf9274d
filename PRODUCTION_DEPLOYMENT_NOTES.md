# Production Deployment Notes

## Deployment Date
[To be filled on deployment]

## Overview
Comprehensive production readiness update implementing 6 critical phases:
1. ✅ RFP function alignment (fixed critical RPC mismatch)
2. ✅ Proposal approval workflow completion
3. ✅ Deadline & notification system
4. ✅ Testing framework & validation
5. ✅ Documentation & code cleanup
6. ✅ Monitoring setup

---

## Critical Changes

### 1. RFP Sending Function Update
**File**: `src/hooks/useRFP.tsx`

**Before**:
```typescript
await supabase.rpc('send_rfp_invitations', {
  project_uuid: projectId,
  selected_supplier_ids: selectedSupplierIds || null, // ❌ Wrong
  ...
});
```

**After**:
```typescript
await supabase.rpc('send_rfp_invitations_to_advisors', {
  project_uuid: projectId,
  selected_advisor_ids: selectedAdvisorIds, // ✅ Correct
  deadline_hours: deadlineHours,
  ...
});
```

**Impact**: RFP invitations now actually create `rfp_invites` records.

---

### 2. Proposal Approval Validation
**File**: `src/components/ProposalApprovalDialog.tsx`

**Added Validation**:
- ✅ Signature must be captured before approval
- ✅ Notes must be provided before approval
- ✅ Toast error messages for missing data

**Impact**: Prevents incomplete approvals, ensures data integrity.

---

### 3. Deadline Countdown Component
**File**: `src/components/DeadlineCountdown.tsx` (NEW)

**Features**:
- Real-time countdown timer
- Color-coded urgency (green → yellow → red)
- Auto-updates every minute
- Displays "פג תוקף" when expired

**Integration**: Added to `src/pages/RFPDetails.tsx`

---

### 4. Proposal File Viewing
**File**: `src/components/ProposalComparisonDialog.tsx`

**Added**:
- New "Files" column in comparison table
- Clickable file links to open attachments
- "No files" message when empty

**Impact**: Entrepreneurs can now view proposal attachments during comparison.

---

## Database Schema Changes
**None** - All required schema changes were already in place from previous migrations.

---

## Configuration Changes

### Updated Components
- `src/hooks/useRFP.tsx` - Critical RPC fix
- `src/hooks/useProposalApproval.ts` - Added JSDoc & logging
- `src/components/RFPWizard.tsx` - Added deadline parameter
- `src/components/RFPManager.tsx` - Fixed advisor selection
- `src/components/PriceProposalManager.tsx` - Fixed advisor selection
- `src/components/ProposalApprovalDialog.tsx` - Added validation
- `src/components/ProposalComparisonDialog.tsx` - Added file column
- `src/pages/RFPDetails.tsx` - Integrated deadline countdown

### New Files
- `src/components/DeadlineCountdown.tsx` - Deadline UI component
- `TESTING_GUIDE.md` - Comprehensive test scenarios
- `PRODUCTION_DEPLOYMENT_NOTES.md` - This file

---

## Pre-Deployment Checklist

### Code Review
- [x] All TypeScript errors resolved
- [x] Build succeeds without warnings
- [x] ESLint passes
- [x] No console.errors in critical paths
- [x] All imports verified

### Database
- [x] All migrations applied
- [x] RLS policies verified
- [x] Existing data compatible with changes
- [x] `send_rfp_invitations_to_advisors` function exists

### Security
- [x] No sensitive data logged
- [x] Signature validation enforced
- [x] RLS policies protect data
- [x] No SQL injection vulnerabilities

### Documentation
- [x] Testing guide created
- [x] JSDoc comments added to critical functions
- [x] Deployment notes documented
- [x] Monitoring queries prepared

---

## Deployment Steps

1. **Pre-Deployment** (30 min before)
   - [ ] Notify users of upcoming deployment
   - [ ] Take database backup
   - [ ] Verify staging environment matches production

2. **Deployment** (10 min)
   - [ ] Deploy frontend changes
   - [ ] Verify build succeeds
   - [ ] Check Supabase edge functions deployed
   - [ ] Verify all environment variables set

3. **Smoke Testing** (30 min after)
   - [ ] Run Test 1.1 (RFP creation)
   - [ ] Run Test 2.4 (Proposal submission)
   - [ ] Run Test 3.3 (Proposal approval)
   - [ ] Check monitoring queries

4. **Post-Deployment** (1 hour after)
   - [ ] Monitor error logs
   - [ ] Check database for anomalies
   - [ ] Verify no user-reported issues
   - [ ] Update status page

---

## Rollback Triggers

Initiate rollback if any of these occur:
- ❌ RFP invitations not creating database records
- ❌ Proposals failing to submit (> 10% failure rate)
- ❌ Database errors in logs
- ❌ User-facing errors not resolved within 15 minutes
- ❌ Critical security vulnerability discovered

---

## Monitoring

### Key Metrics to Watch (First 24 hours)

1. **RFP Creation Rate**
   ```sql
   SELECT COUNT(*) FROM rfps WHERE sent_at > now() - interval '24 hours';
   ```
   Expected: Similar to previous 24 hours (baseline)

2. **Invitation Success Rate**
   ```sql
   SELECT 
     COUNT(r.id) as rfps,
     COUNT(ri.id) as invites
   FROM rfps r
   LEFT JOIN rfp_invites ri ON ri.rfp_id = r.id
   WHERE r.sent_at > now() - interval '24 hours';
   ```
   Expected: invites > 0 for every RFP

3. **Proposal Submission Rate**
   ```sql
   SELECT COUNT(*) FROM proposals WHERE submitted_at > now() - interval '24 hours';
   ```
   Expected: Increase from previous baseline (0 → > 0)

4. **Orphaned Proposals**
   ```sql
   SELECT COUNT(*) FROM proposals WHERE project_id IS NULL;
   ```
   Expected: 0 (critical)

5. **Error Logs**
   Check Supabase logs for:
   - Database errors
   - RLS policy violations
   - Edge function failures

---

## Known Limitations

1. **Email Notifications**: Not implemented yet
   - RFP invitations do not send actual emails
   - Advisors must check dashboard manually
   - **Workaround**: Add to future sprint

2. **File Upload Size**: Limited to 10MB per file
   - Supabase storage default limit
   - **Workaround**: Documented in UI

3. **Proposal Amendments**: Not supported
   - Advisors cannot edit submitted proposals
   - **Workaround**: Must withdraw and resubmit

4. **Multi-Language**: Hebrew only
   - No English/Arabic support yet
   - **Workaround**: Add to future roadmap

---

## Performance Benchmarks

### Expected Response Times
- RFP creation: < 2 seconds
- Proposal submission: < 3 seconds
- Proposal approval: < 2 seconds
- Page load (RFP details): < 1 second

### Database Query Performance
- RFP list query: < 500ms
- Proposal comparison: < 1 second (up to 20 proposals)

---

## Support Contacts

- **Technical Lead**: [Your Name]
- **Database Admin**: [DBA Name]
- **On-Call Engineer**: [Engineer Name]
- **Emergency Hotline**: [Phone Number]

---

## Post-Deployment Tasks

### Immediate (Within 24 hours)
- [ ] Monitor error rates
- [ ] Verify all tests pass
- [ ] Check user feedback
- [ ] Update sprint board

### Week 1
- [ ] Analyze conversion funnel metrics
- [ ] Gather user feedback
- [ ] Identify optimization opportunities
- [ ] Plan next iteration

### Week 2
- [ ] Review monitoring data
- [ ] Optimize slow queries
- [ ] Address user-reported issues
- [ ] Update documentation based on learnings

---

## Lessons Learned
[To be filled after deployment]

---

## Approval

- **Developer**: [Sign-off]
- **Tech Lead**: [Sign-off]
- **Product Owner**: [Sign-off]
- **Date**: [Date]

---

## Appendix: Critical Code Paths

### RFP Sending Flow
```
User clicks "Send RFP"
  → RFPWizard.handleSendRFP()
  → useRFP.sendRFPInvitations()
  → supabase.rpc('send_rfp_invitations_to_advisors')
  → Database function creates rfps + rfp_invites
  → Toast notification shown
```

### Proposal Submission Flow
```
Advisor clicks "Submit Proposal"
  → SubmitProposal.handleSubmit()
  → useProposalSubmit.submitProposal()
  → Validate signature + data
  → Insert into proposals table
  → Insert into signatures table
  → Insert into activity_log
  → Toast notification shown
```

### Proposal Approval Flow
```
Entrepreneur clicks "Approve"
  → ProposalApprovalDialog opens
  → User adds notes (validated)
  → User signs (validated)
  → useProposalApproval.approveProposal()
  → Update proposals.status = 'accepted'
  → Insert into project_advisors
  → Insert entrepreneur signature
  → Insert into activity_log
  → Toast notification shown
```

---

End of Deployment Notes

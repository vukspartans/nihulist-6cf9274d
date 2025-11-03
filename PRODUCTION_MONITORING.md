# Production Monitoring Guide

## Overview
This guide contains SQL queries and procedures for monitoring the RFP/Proposal system health in production.

---

## Daily Health Checks

### 1. RFP Activity (Last 24 Hours)
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

**Expected Values**:
- rfps_sent_today > 0
- invites_sent_today > rfps_sent_today * 3 (at least 3 advisors per RFP)
- proposals_received_today > 0

---

### 2. Conversion Funnel (Last 7 Days)
```sql
WITH funnel AS (
  SELECT 'RFPs Sent' as stage, COUNT(*) as count, 1 as order_num
  FROM rfps WHERE sent_at > now() - interval '7 days'
  UNION ALL
  SELECT 'Invites Sent', COUNT(*), 2
  FROM rfp_invites WHERE created_at > now() - interval '7 days'
  UNION ALL
  SELECT 'Proposals Submitted', COUNT(*), 3
  FROM proposals WHERE submitted_at > now() - interval '7 days'
  UNION ALL
  SELECT 'Proposals Approved', COUNT(*), 4
  FROM proposals 
  WHERE status = 'accepted' AND submitted_at > now() - interval '7 days'
)
SELECT 
  stage,
  count,
  ROUND(100.0 * count / FIRST_VALUE(count) OVER (ORDER BY order_num), 2) as conversion_rate
FROM funnel
ORDER BY order_num;
```

**Expected Conversion Rates**:
- RFPs → Invites: ~300-500% (3-5 advisors per RFP)
- Invites → Proposals: >60%
- Proposals → Approved: >40%

---

### 3. Deadline Compliance
```sql
SELECT 
  COUNT(*) as total_invites_with_deadline,
  COUNT(*) FILTER (WHERE status = 'submitted' AND submitted_at < deadline_at) as submitted_on_time,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  COUNT(*) FILTER (WHERE status IN ('sent', 'opened') AND deadline_at > now()) as still_open,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'submitted') / NULLIF(COUNT(*), 0), 2) as response_rate
FROM rfp_invites
WHERE deadline_at IS NOT NULL
  AND created_at > now() - interval '30 days';
```

**Expected Values**:
- response_rate > 60%
- expired / total < 30%

---

### 4. Data Integrity Check
```sql
-- Check for orphaned records (should all be 0)
SELECT 
  'Proposals without Project' as issue,
  COUNT(*) as count
FROM proposals p
LEFT JOIN projects proj ON proj.id = p.project_id
WHERE proj.id IS NULL

UNION ALL

SELECT 
  'Proposals without Advisor',
  COUNT(*)
FROM proposals p
LEFT JOIN advisors a ON a.id = p.advisor_id
WHERE a.id IS NULL

UNION ALL

SELECT 
  'RFP Invites without RFP',
  COUNT(*)
FROM rfp_invites ri
LEFT JOIN rfps r ON r.id = ri.rfp_id
WHERE r.id IS NULL

UNION ALL

SELECT 
  'Project Advisors without Proposal',
  COUNT(*)
FROM project_advisors pa
WHERE pa.proposal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM proposals p WHERE p.id = pa.proposal_id
  );
```

**Expected**: All counts should be 0 (foreign keys prevent this).

---

### 5. Signature Audit
```sql
SELECT 
  entity_type,
  COUNT(*) as total_signatures,
  COUNT(DISTINCT signer_user_id) as unique_signers,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as last_24h
FROM signatures
GROUP BY entity_type
ORDER BY total_signatures DESC;
```

**Expected**:
- `proposal`: Should match submitted proposals count
- `proposal_approval`: Should match accepted proposals count

---

## Performance Monitoring

### 1. Slow Query Detection
```sql
-- Monitor materialized view freshness
SELECT 
  schemaname,
  matviewname,
  last_refresh,
  now() - last_refresh as age
FROM pg_matviews
WHERE matviewname = 'proposal_summary';
```

**Action**: If age > 1 hour, run `SELECT refresh_proposal_summary();`

---

### 2. Index Usage
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as rows_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('proposals', 'rfp_invites', 'projects', 'advisors')
ORDER BY idx_scan ASC
LIMIT 10;
```

**Review**: If idx_scan = 0, consider dropping unused indexes.

---

## Error Monitoring

### 1. Failed Approvals (Activity Log)
```sql
SELECT 
  created_at,
  meta->>'error' as error_message,
  entity_id as proposal_id
FROM activity_log
WHERE action = 'signature_creation_failed'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

---

### 2. RPC Function Errors (Supabase Logs)
Check edge function logs for:
- `send_rfp_invitations_to_advisors` errors
- `approve_proposal_atomic` errors

---

## Alerts & Thresholds

Set up alerts for:

1. **Zero Activity**:
   - No RFPs sent in last 24 hours
   - No proposals submitted in last 48 hours

2. **Low Conversion**:
   - Invite → Proposal conversion < 40%
   - Proposal → Approval conversion < 30%

3. **High Expiry Rate**:
   - Expired RFPs > 40% of total

4. **Data Integrity Violations**:
   - Any orphaned records detected
   - Missing signatures for submitted proposals

---

## Weekly Reports

Run this weekly to track trends:

```sql
WITH weekly_stats AS (
  SELECT 
    date_trunc('week', sent_at) as week,
    COUNT(*) as rfps_sent,
    COUNT(DISTINCT sent_by) as active_entrepreneurs,
    AVG((
      SELECT COUNT(*) FROM rfp_invites WHERE rfp_id = rfps.id
    )) as avg_invites_per_rfp
  FROM rfps
  WHERE sent_at > now() - interval '12 weeks'
  GROUP BY week
)
SELECT 
  week,
  rfps_sent,
  active_entrepreneurs,
  ROUND(avg_invites_per_rfp, 1) as avg_invites_per_rfp
FROM weekly_stats
ORDER BY week DESC;
```

---

## Maintenance Tasks

### Daily:
- Refresh materialized view: `SELECT refresh_proposal_summary();`
- Check for expired RFPs (handled by cron job)

### Weekly:
- Review orphaned records query
- Check index usage
- Analyze conversion funnel

### Monthly:
- Vacuum analyze all tables
- Review and archive old activity logs (>6 months)
- Update monitoring thresholds based on trends

---

## Emergency Procedures

### If RFP Invites Not Sending:
1. Check advisor approval status:
   ```sql
   SELECT id, company_name, admin_approved 
   FROM advisors 
   WHERE is_active = true;
   ```
2. Check RPC function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'send_rfp_invitations_to_advisors';
   ```
3. Check RLS policies on rfp_invites
4. Review edge function logs

### If Proposals Not Submitting:
1. Check deadline validation:
   ```sql
   SELECT id, deadline_at, status 
   FROM rfp_invites 
   WHERE deadline_at < now() AND status != 'expired';
   ```
2. Check foreign key constraints
3. Review proposal validation trigger logs

---

## Contact & Escalation

For critical issues:
1. Check PRODUCTION_DEPLOYMENT_NOTES.md
2. Review recent migrations in `supabase/migrations/`
3. Check TESTING_GUIDE.md for smoke tests
4. Review edge function logs in Supabase dashboard

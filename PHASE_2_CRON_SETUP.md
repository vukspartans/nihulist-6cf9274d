# Phase 2: Data Integrity - Cron Job Setup Instructions

## Overview
Phase 2 implements automated data integrity features including:
- ✅ Foreign key cascades to prevent orphaned data
- ✅ Notification queue for reliable email delivery
- ✅ Automated RFP invite expiration
- ✅ Duplicate advisor detection and warnings

## Automated Tasks Setup

### 1. RFP Invite Expiration (Cron Job)

The `expire-invites` edge function automatically marks RFP invites as expired when their deadline passes.

**To enable automated expiration:**

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron and pg_net extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule expire-invites to run every hour
SELECT cron.schedule(
  'expire-rfp-invites-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-invites',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhemFrY2V5cnVlZmVqZXloa2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjA4MzUsImV4cCI6MjA3MDU5NjgzNX0.fA2KNJx6503vwVSQ8hJ1VdzOJEqVIVYhE-4Z48KS_dg"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

**Verify the cron job:**
```sql
SELECT * FROM cron.job WHERE jobname = 'expire-rfp-invites-hourly';
```

### 2. Notification Queue Processing (Cron Job)

The `process-notification-queue` edge function processes pending email notifications with retry logic.

**To enable notification queue processing:**

```sql
-- Schedule notification processing to run every 5 minutes
SELECT cron.schedule(
  'process-notification-queue',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://aazakceyruefejeyhkbk.supabase.co/functions/v1/process-notification-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhemFrY2V5cnVlZmVqZXloa2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjA4MzUsImV4cCI6MjA3MDU5NjgzNX0.fA2KNJx6503vwVSQ8hJ1VdzOJEqVIVYhE-4Z48KS_dg"}'::jsonb,
        body:='{"batch_size": 20}'::jsonb
    ) as request_id;
  $$
);
```

**Verify the cron job:**
```sql
SELECT * FROM cron.job WHERE jobname = 'process-notification-queue';
```

### 3. Manual Testing

You can manually trigger the edge functions for testing:

**Test expire-invites:**
```bash
curl -X POST https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-invites \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Test notification queue:**
```bash
curl -X POST https://aazakceyruefejeyhkbk.supabase.co/functions/v1/process-notification-queue \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 10, "test_mode": true}'
```

## Monitoring

### Check Cron Job History
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname IN ('expire-rfp-invites-hourly', 'process-notification-queue')
ORDER BY start_time DESC 
LIMIT 20;
```

### Check Activity Logs
```sql
-- Check expired invites
SELECT * FROM activity_log 
WHERE action = 'rfp_invite_expired' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check notification queue status
SELECT 
  status,
  COUNT(*) as count,
  AVG(attempts) as avg_attempts
FROM notification_queue 
GROUP BY status;
```

### Check Failed Notifications
```sql
SELECT 
  id,
  notification_type,
  recipient_email,
  attempts,
  last_error,
  last_attempt_at
FROM notification_queue 
WHERE status = 'failed' 
ORDER BY last_attempt_at DESC;
```

## Unscheduling Cron Jobs

If you need to disable a cron job:

```sql
-- Unschedule expire-invites
SELECT cron.unschedule('expire-rfp-invites-hourly');

-- Unschedule notification processing
SELECT cron.unschedule('process-notification-queue');
```

## Database Changes Summary

### Foreign Key Cascades Added:
- ✅ `proposals.project_id` → CASCADE on delete
- ✅ `project_advisors.project_id` → CASCADE on delete
- ✅ `rfps.project_id` → CASCADE on delete
- ✅ `rfp_invites.rfp_id` → CASCADE on delete
- ✅ `project_files.project_id` → CASCADE on delete
- ✅ `activity_log.project_id` → CASCADE on delete

### New Tables:
- ✅ `notification_queue` - Reliable email notification delivery with retry logic

### New Functions:
- ✅ `enqueue_notification()` - Queue notifications for async delivery
- ✅ `update_notification_queue_updated_at()` - Auto-update timestamps

### New Edge Functions:
- ✅ `expire-invites` - Automatically expire RFP invites past deadline
- ✅ `process-notification-queue` - Process pending notifications with retries

## Next Steps

After setting up the cron jobs:

1. **Monitor the logs** for the first 24 hours to ensure proper operation
2. **Check the notification queue** periodically to ensure emails are being sent
3. **Review activity logs** to confirm invite expirations are working
4. **Consider implementing Phase 3** (Performance optimization) next

## Troubleshooting

### Cron jobs not running:
- Verify `pg_cron` extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Check cron job status: `SELECT * FROM cron.job;`
- Review error logs: `SELECT * FROM cron.job_run_details WHERE status = 'failed';`

### Notifications not sending:
- Check notification queue: `SELECT * FROM notification_queue WHERE status = 'failed';`
- Verify Resend API key is set in edge function secrets
- Check edge function logs in Supabase dashboard

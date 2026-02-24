

# Keep Only expire-rfps and expire-invites Active

## What Changes

Unschedule 8 cron jobs, leaving only `expire-rfps` and `expire-invites` running.

## Jobs to Remove

| Job | Current Schedule |
|---|---|
| expire-stale-negotiations | Daily 3 AM |
| cleanup-unused-negotiation-files | Daily 4 AM |
| process-notification-queue | Every 5 min |
| deadline-reminder | Daily 8 AM |
| rfp-reminder-scheduler | Daily 9 AM |
| retry-failed-emails | Every 15 min |
| payment-deadline-reminder | Daily 7 AM |
| notify-payment-status | Every 30 min |

## Jobs That Stay

| Job | Schedule |
|---|---|
| expire-rfps | Every hour |
| expire-invites | Every hour |

## How

Run this SQL in the Supabase SQL Editor:

```sql
SELECT cron.unschedule('expire-stale-negotiations');
SELECT cron.unschedule('cleanup-unused-negotiation-files');
SELECT cron.unschedule('process-notification-queue');
SELECT cron.unschedule('deadline-reminder');
SELECT cron.unschedule('rfp-reminder-scheduler');
SELECT cron.unschedule('retry-failed-emails');
SELECT cron.unschedule('payment-deadline-reminder');
SELECT cron.unschedule('notify-payment-status');

-- Verify only 2 remain
SELECT jobname, schedule FROM cron.job ORDER BY jobname;
```

No code files are modified. This is a SQL-only change run manually in the dashboard.


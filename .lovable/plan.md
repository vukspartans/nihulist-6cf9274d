

# Auto-Expire Stale Negotiation Sessions

## Problem
9 negotiation sessions are stuck in `awaiting_response` status for up to 67 days with no expiry mechanism. Advisors who never respond leave these sessions hanging indefinitely.

## Solution
Create a new edge function `expire-stale-negotiations` that runs on a cron schedule (daily) to cancel sessions stuck in `awaiting_response` for more than 30 days. Follows the exact same pattern as the existing `expire-invites` function.

## Changes

### 1. New Edge Function: `supabase/functions/expire-stale-negotiations/index.ts`
- Query `negotiation_sessions` where `status = 'awaiting_response'` and `created_at < now() - 30 days`
- Update status to `cancelled`
- Set `resolved_at` to current timestamp
- Log each expiration to `activity_log` with action `negotiation_session_expired`
- Enqueue a notification to the initiator (entrepreneur) informing them the session expired
- Return count of expired sessions

### 2. Update `supabase/config.toml`
- Add `[functions.expire-stale-negotiations]` with `verify_jwt = false` (called by cron)

### 3. Manual Step: Add Cron Job
After deployment, the user runs SQL in the Supabase SQL Editor to schedule the function daily at 3 AM:

```text
SELECT cron.schedule(
  'expire-stale-negotiations-daily',
  '0 3 * * *',
  $$ SELECT net.http_post(
    url:='https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-stale-negotiations',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id; $$
);
```

## Technical Details

- **Threshold**: 30 days from `created_at` (not `updated_at`, since `updated_at` auto-refreshes)
- **New status**: Uses existing `cancelled` status from the `negotiation_status` enum -- no schema changes needed
- **Notification**: Uses `enqueue_notification()` DB function to queue an email to the entrepreneur, which will be processed by the already-running `process-notification-queue` cron
- **Idempotent**: Safe to run multiple times; only affects sessions still in `awaiting_response`
- **Pattern**: Mirrors `expire-invites` function structure exactly


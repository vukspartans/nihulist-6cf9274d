

# Fix Stuck Notification Queue

## Problem

27 notifications are stuck in `pending` status (16 `payment_terms_changed`, 6 `negotiation_response`, 5 `negotiation_request`) with `attempts: 0` -- they've never been processed.

**Root cause**: The `pg_cron` extension is **not enabled** on this Supabase project, so the scheduled cron job to call `process-notification-queue` was never created. The edge function itself works perfectly (verified by test call that processed 5 notifications successfully).

## Fix (2 steps)

### Step 1: Add `process-notification-queue` to config.toml

The function is missing from `supabase/config.toml`. Add it with `verify_jwt = false` so the cron job (which uses the anon key) can call it.

### Step 2: Enable pg_cron and create the scheduled job

Run SQL via the Supabase SQL Editor to:
1. Enable `pg_cron` and `pg_net` extensions
2. Create a cron job that calls `process-notification-queue` every 5 minutes

```text
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule every 5 minutes
SELECT cron.schedule(
  'process-notification-queue',
  '*/5 * * * *',
  $$ SELECT net.http_post(
    url:='https://aazakceyruefejeyhkbk.supabase.co/functions/v1/process-notification-queue',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{"batch_size":20}'::jsonb
  ) as request_id; $$
);
```

This SQL must be run manually in the Supabase SQL Editor (not as a migration) because it contains project-specific secrets.

### Step 3: Process the existing 27 stuck notifications

After deploying the config change, manually invoke the function once (without test_mode) to flush the backlog. This will be done by calling the edge function directly.

## Technical Details

- The edge function code is correct and working -- no changes needed there
- It sends emails via Resend, with retry logic and exponential backoff
- Only `config.toml` needs a code change (1 line)
- The cron setup requires manual SQL execution by the user in the Supabase dashboard


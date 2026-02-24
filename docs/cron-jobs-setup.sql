-- =============================================================================
-- Cron Jobs Setup Script
-- =============================================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).
-- DO NOT commit this as a migration — it contains project-specific URLs.
--
-- Prerequisites:
--   1. Enable pg_cron and pg_net extensions (Database > Extensions)
--   2. Replace 'YOUR_CRON_SECRET_HERE' with the value of CRON_SECRET_CURRENT
--
-- This script:
--   1. Unschedules all 10 jobs (safe if they don't exist)
--   2. Reschedules all 10 with x-cron-secret and x-cron-timestamp headers
-- =============================================================================

-- ── Step 1: Unschedule existing jobs (safe idempotent cleanup) ──────────────

DO $$
DECLARE
  job_names text[] := ARRAY[
    'expire-rfps',
    'expire-invites',
    'expire-stale-negotiations',
    'cleanup-unused-negotiation-files',
    'process-notification-queue',
    'deadline-reminder',
    'rfp-reminder-scheduler',
    'retry-failed-emails',
    'payment-deadline-reminder',
    'notify-payment-status'
  ];
  jn text;
BEGIN
  FOREACH jn IN ARRAY job_names LOOP
    BEGIN
      PERFORM cron.unschedule(jn);
      RAISE NOTICE 'Unscheduled: %', jn;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped (not found): %', jn;
    END;
  END LOOP;
END $$;

-- ── Step 2: Schedule all 10 jobs ────────────────────────────────────────────
-- Replace YOUR_CRON_SECRET_HERE with the actual secret value.

-- 1. expire-rfps — every hour
SELECT cron.schedule(
  'expire-rfps',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-rfps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 2. expire-invites — every hour
SELECT cron.schedule(
  'expire-invites',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-invites',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3. expire-stale-negotiations — daily 3 AM UTC
SELECT cron.schedule(
  'expire-stale-negotiations',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-stale-negotiations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 4. cleanup-unused-negotiation-files — daily 4 AM UTC
SELECT cron.schedule(
  'cleanup-unused-negotiation-files',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/cleanup-unused-negotiation-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 5. process-notification-queue — every 5 minutes
SELECT cron.schedule(
  'process-notification-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/process-notification-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 6. deadline-reminder — daily 8 AM UTC
SELECT cron.schedule(
  'deadline-reminder',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/deadline-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 7. rfp-reminder-scheduler — daily 9 AM UTC
SELECT cron.schedule(
  'rfp-reminder-scheduler',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/rfp-reminder-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 8. retry-failed-emails — every 15 minutes
SELECT cron.schedule(
  'retry-failed-emails',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/retry-failed-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 9. payment-deadline-reminder — daily 7 AM UTC
SELECT cron.schedule(
  'payment-deadline-reminder',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/payment-deadline-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 10. notify-payment-status — every 30 minutes
SELECT cron.schedule(
  'notify-payment-status',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://aazakceyruefejeyhkbk.supabase.co/functions/v1/notify-payment-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE',
      'x-cron-timestamp', extract(epoch from now())::text
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Verify ──────────────────────────────────────────────────────────────────
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;

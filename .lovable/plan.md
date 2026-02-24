

# Finalize Cron Hardening: Remove Legacy, Harden Timestamps, SQL Script, Checklist

## Overview

Four targeted changes to finalize the cron security layer. No business logic touched.

---

## A. Remove Legacy Secret Fallback

**File:** `supabase/functions/_shared/cron-auth.ts`

Remove lines 35-46 (the `CRON_SECRET` legacy check and the service role key fallback). The validation will only accept:

- `CRON_SECRET_CURRENT` -- primary
- `CRON_SECRET_PREVIOUS` -- rotation window (skipped if env var is empty/unset)

The `service_role` fallback via Authorization header is also removed. The `authMethod` type narrows to `'cron_secret_current' | 'cron_secret_previous' | 'none'`.

Reject reasons become more specific:
- `missing_secret_header` -- no `x-cron-secret` header sent
- `invalid_secret` -- header present but doesn't match CURRENT or PREVIOUS
- `missing_timestamp` -- no `x-cron-timestamp` header
- `unparseable_timestamp` -- header present but not a valid number
- `replay_rejected` -- timestamp drift exceeds 60 seconds

## B. Resilient Timestamp Validation

Same file. The timestamp check applies to ALL authenticated requests (not just `cron_secret_*` since service_role is removed). Changes:

- Accept string or numeric epoch (already works via `parseFloat`)
- Distinguish missing vs unparseable: check `tsHeader === null` separately from `isNaN`
- Always compute and log `timestampDelta` when parseable, even on rejection
- Round to 1 decimal place for clean logs

## C. SQL Script for All 10 pg_cron Jobs

**New file:** `docs/cron-jobs-setup.sql`

A single SQL script to run in the Supabase SQL Editor (NOT committed as a migration). It:

1. Unschedules all 10 jobs by name (with `IF EXISTS` safety via try/catch in a DO block)
2. Reschedules all 10 with consistent naming, correct URLs, and headers including `x-cron-secret` and `x-cron-timestamp`

The secret value uses a placeholder `'YOUR_CRON_SECRET_HERE'` that you replace before running. The timestamp is generated dynamically via `extract(epoch from now())::text`.

The 10 jobs and their schedules:

| Job Name | Schedule | Function |
|---|---|---|
| `expire-rfps` | Every hour (`0 * * * *`) | expire-rfps |
| `expire-invites` | Every hour (`0 * * * *`) | expire-invites |
| `expire-stale-negotiations` | Daily 3 AM (`0 3 * * *`) | expire-stale-negotiations |
| `cleanup-unused-negotiation-files` | Daily 4 AM (`0 4 * * *`) | cleanup-unused-negotiation-files |
| `process-notification-queue` | Every 5 min (`*/5 * * * *`) | process-notification-queue |
| `deadline-reminder` | Daily 8 AM (`0 8 * * *`) | deadline-reminder |
| `rfp-reminder-scheduler` | Daily 9 AM (`0 9 * * *`) | rfp-reminder-scheduler |
| `retry-failed-emails` | Every 15 min (`*/15 * * * *`) | retry-failed-emails |
| `payment-deadline-reminder` | Daily 7 AM (`0 7 * * *`) | payment-deadline-reminder |
| `notify-payment-status` | Every 30 min (`*/30 * * * *`) | notify-payment-status |

## D. Checklist Document

**New file:** `docs/cron-security-checklist.md`

A one-page markdown doc covering:

1. **Testing 401 cases** -- curl commands to test missing secret, wrong secret, missing timestamp, stale timestamp
2. **Confirming jobs are scheduled** -- SQL queries to check `cron.job` and `cron.job_run_details`
3. **Secret rotation procedure** -- step-by-step zero-downtime rotation using CURRENT/PREVIOUS

---

## Technical Details

### Updated `validateCronRequest` Logic

```typescript
export function validateCronRequest(req: Request): CronAuthResult {
  const secret = req.headers.get('x-cron-secret');
  const current = Deno.env.get('CRON_SECRET_CURRENT');
  const previous = Deno.env.get('CRON_SECRET_PREVIOUS');

  // Step 1: Secret validation
  let authMethod: CronAuthResult['authMethod'] = 'none';

  if (!secret) {
    return { isValid: false, authMethod: 'none', timestampDelta: null, rejectReason: 'missing_secret_header' };
  }

  if (current && secret === current) {
    authMethod = 'cron_secret_current';
  } else if (previous && secret === previous) {
    authMethod = 'cron_secret_previous';
  } else {
    return { isValid: false, authMethod: 'none', timestampDelta: null, rejectReason: 'invalid_secret' };
  }

  // Step 2: Timestamp validation
  const tsHeader = req.headers.get('x-cron-timestamp');

  if (tsHeader === null) {
    return { isValid: false, authMethod, timestampDelta: null, rejectReason: 'missing_timestamp' };
  }

  const tsEpoch = parseFloat(tsHeader);

  if (isNaN(tsEpoch)) {
    return { isValid: false, authMethod, timestampDelta: null, rejectReason: 'unparseable_timestamp' };
  }

  const nowEpoch = Date.now() / 1000;
  const timestampDelta = Math.round((nowEpoch - tsEpoch) * 10) / 10;

  if (Math.abs(timestampDelta) > 60) {
    return { isValid: false, authMethod, timestampDelta, rejectReason: 'replay_rejected' };
  }

  return { isValid: true, authMethod, timestampDelta };
}
```

### Files Changed Summary

| File | Action |
|---|---|
| `supabase/functions/_shared/cron-auth.ts` | Remove legacy/service_role fallback, harden timestamp parsing |
| `docs/cron-jobs-setup.sql` | New -- single SQL script for all 10 pg_cron jobs |
| `docs/cron-security-checklist.md` | New -- testing and rotation checklist |

### What Does NOT Change

- No business logic in any of the 10 cron functions
- No config.toml changes (already correct)
- No database schema changes
- No frontend changes


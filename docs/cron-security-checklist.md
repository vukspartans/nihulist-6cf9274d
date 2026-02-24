# Cron Security Checklist

## 1. Testing 401 Cases

Replace `YOUR_CRON_SECRET` with the actual `CRON_SECRET_CURRENT` value. All commands below should return `401 Unauthorized`.

### Missing secret header

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-rfps \
  -H "Content-Type: application/json" \
  -H "x-cron-timestamp: $(date +%s)"
# Expected: 401 — reason: missing_secret_header
```

### Wrong secret

```bash
curl -s -w "\n%{http_code}" \
  -X POST https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-rfps \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: wrong-value" \
  -H "x-cron-timestamp: $(date +%s)"
# Expected: 401 — reason: invalid_secret
```

### Missing timestamp

```bash
curl -s -w "\n%{http_code}" \
  -X POST https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-rfps \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
# Expected: 401 — reason: missing_timestamp
```

### Stale timestamp (replay attack)

```bash
curl -s -w "\n%{http_code}" \
  -X POST https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-rfps \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "x-cron-timestamp: 1000000000"
# Expected: 401 — reason: replay_rejected
```

### Valid request (should succeed)

```bash
curl -s -w "\n%{http_code}" \
  -X POST https://aazakceyruefejeyhkbk.supabase.co/functions/v1/expire-rfps \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "x-cron-timestamp: $(date +%s)"
# Expected: 200
```

---

## 2. Confirming Jobs Are Scheduled

Run these in the Supabase SQL Editor.

### List all scheduled jobs

```sql
SELECT jobid, jobname, schedule, command
FROM cron.job
ORDER BY jobname;
```

You should see all 10 jobs listed.

### Check recent job runs

```sql
SELECT
  j.jobname,
  jrd.status,
  jrd.start_time,
  jrd.end_time,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
ORDER BY jrd.start_time DESC
LIMIT 20;
```

### Check for failures only

```sql
SELECT
  j.jobname,
  jrd.status,
  jrd.start_time,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE jrd.status = 'failed'
ORDER BY jrd.start_time DESC
LIMIT 10;
```

---

## 3. Secret Rotation Procedure (Zero Downtime)

### Step 1: Prepare the new secret

Generate a new random secret (e.g., 64 hex chars):

```bash
openssl rand -hex 32
```

### Step 2: Set PREVIOUS = current CURRENT

In the Supabase Dashboard → Edge Functions → Secrets:

- Copy the current value of `CRON_SECRET_CURRENT`
- Set `CRON_SECRET_PREVIOUS` to that value

### Step 3: Set CURRENT = new secret

- Set `CRON_SECRET_CURRENT` to the new secret generated in Step 1

At this point, both old and new secrets are accepted (zero downtime).

### Step 4: Update pg_cron jobs

Run the SQL script (`docs/cron-jobs-setup.sql`) with the **new** secret replacing `YOUR_CRON_SECRET_HERE`.

### Step 5: Verify

- Wait for a few cron cycles to pass
- Check `cron.job_run_details` for successful runs (see Section 2 above)
- Check Edge Function logs for `authMethod: "cron_secret_current"` (not `cron_secret_previous`)

### Step 6: Clear PREVIOUS

Once all jobs are confirmed working with the new secret:

- Set `CRON_SECRET_PREVIOUS` to an empty string (or remove it)

Rotation complete.

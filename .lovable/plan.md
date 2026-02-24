

# Cron Security Hardening -- Secret Rotation, Replay Protection, and Centralized Wrapper

## What Changes

We will upgrade the shared cron authentication layer to support secret rotation, replay attack prevention, and structured logging -- then wrap all 10 cron-triggered edge functions with a clean `withCronSecurity` helper. No business logic changes.

---

## Architecture

```text
pg_cron job
  |
  | sends: x-cron-secret + x-cron-timestamp headers
  v
Edge Function entry point
  |
  v
withCronSecurity(handler)
  |-- validates x-cron-secret against CRON_SECRET_CURRENT or CRON_SECRET_PREVIOUS
  |-- validates x-cron-timestamp is within 60 seconds
  |-- logs: function name, auth method, valid/invalid, timestamp delta
  |-- on success: calls handler(req)
  |-- on failure: returns 401
```

---

## Files Changed

### 1. `supabase/functions/_shared/cron-auth.ts` -- Rewrite

Replace the current `validateCronRequest` with two exports:

- **`validateCronRequest(req)`** -- Updated to:
  - Check `x-cron-secret` against `CRON_SECRET_CURRENT` first, then `CRON_SECRET_PREVIOUS` (rotation support)
  - Fallback to service role key in Authorization header (backward compat)
  - Validate `x-cron-timestamp` header: reject if missing or older than 60 seconds (replay protection)
  - Return structured log object with `authMethod`, `isValid`, `timestampDelta`

- **`withCronSecurity(functionName, handler)`** -- New wrapper:
  - Handles OPTIONS/CORS
  - Calls `validateCronRequest`
  - Logs structured JSON: `{ function, authMethod, valid, timestampDelta, timestamp }`
  - On success: delegates to `handler(req)`
  - On failure: returns 401 with JSON error
  - Catches unhandled errors from handler and returns 500

### 2. All 10 cron edge functions -- Simplified entry point

Each function replaces the boilerplate:
```typescript
// BEFORE (in each function)
import { validateCronRequest } from '../_shared/cron-auth.ts';
serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response(null, { headers: corsHeaders }) }
  const authError = validateCronRequest(req);
  if (authError) return authError;
  try { /* business logic */ } catch { /* error handling */ }
});

// AFTER
import { withCronSecurity } from '../_shared/cron-auth.ts';
serve(withCronSecurity('function-name', async (req) => {
  // business logic only -- no auth, no CORS, no try/catch boilerplate
}));
```

The 10 functions are:
1. `expire-rfps`
2. `expire-invites`
3. `expire-stale-negotiations`
4. `cleanup-unused-negotiation-files`
5. `process-notification-queue`
6. `deadline-reminder`
7. `rfp-reminder-scheduler`
8. `retry-failed-emails`
9. `payment-deadline-reminder`
10. `notify-payment-status`

### 3. Secrets -- Manual Step

Two secrets must be added to Supabase Edge Function environment variables:
- `CRON_SECRET_CURRENT` -- the active secret used in pg_cron headers
- `CRON_SECRET_PREVIOUS` -- set to the old `CRON_SECRET` value during rotation, or empty string initially

The old `CRON_SECRET` env var can be kept temporarily for backward compatibility but will no longer be checked.

### 4. pg_cron Jobs -- SQL Update (Manual)

All 10 cron jobs must be updated to send:
```sql
headers:=json_build_object(
  'Content-Type', 'application/json',
  'x-cron-secret', current_setting('app.cron_secret_current', true),
  'x-cron-timestamp', extract(epoch from now())::text
)::jsonb
```

However, `current_setting` requires a custom GUC which adds complexity. The simpler approach: reference the secret value directly in the SQL (it's stored in `cron.job` which is only accessible to the postgres role). This is the standard Supabase pattern -- the secret lives in the database's cron config, not in the git repo.

A setup SQL script will be provided (to run in SQL Editor, not committed to repo) that:
- Unschedules old jobs
- Reschedules all 10 with `x-cron-timestamp` header added using `extract(epoch from now())::text`

---

## Technical Details

### `withCronSecurity` Signature

```typescript
export function withCronSecurity(
  functionName: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response>
```

### Validation Logic

```typescript
// 1. Secret check (rotation-safe)
const secret = req.headers.get('x-cron-secret');
const current = Deno.env.get('CRON_SECRET_CURRENT');
const previous = Deno.env.get('CRON_SECRET_PREVIOUS');

let authMethod = 'none';
if (current && secret === current) authMethod = 'cron_secret_current';
else if (previous && secret === previous) authMethod = 'cron_secret_previous';
else {
  // Fallback: service role key
  const auth = req.headers.get('authorization');
  const srk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (auth && srk && auth === `Bearer ${srk}`) authMethod = 'service_role';
}

// 2. Timestamp check (replay protection)
const tsHeader = req.headers.get('x-cron-timestamp');
const tsEpoch = tsHeader ? parseFloat(tsHeader) : NaN;
const nowEpoch = Date.now() / 1000;
const delta = Math.abs(nowEpoch - tsEpoch);

// Reject if no timestamp or > 60s old (skip for service_role fallback)
if (authMethod.startsWith('cron_secret') && (isNaN(tsEpoch) || delta > 60)) {
  // reject as replay
}
```

### Structured Log Output

```json
{
  "type": "cron_auth",
  "function": "expire-rfps",
  "authMethod": "cron_secret_current",
  "valid": true,
  "timestampDelta": 2.3,
  "timestamp": "2026-02-24T12:00:00.000Z"
}
```

### Error Handling in Wrapper

The `withCronSecurity` wrapper catches any unhandled error thrown by the handler and returns a 500 response with `{ error: message }`. This means individual functions no longer need their own top-level try/catch -- though they can keep internal error handling for partial failures.

---

## Secret Rotation Procedure

To rotate the cron secret:
1. Set `CRON_SECRET_PREVIOUS` = current value of `CRON_SECRET_CURRENT`
2. Set `CRON_SECRET_CURRENT` = new random value
3. Update pg_cron jobs with the new secret value
4. After confirming all jobs work, clear `CRON_SECRET_PREVIOUS`

---

## What Does NOT Change

- No business logic in any of the 10 functions
- No database schema changes
- No config.toml changes (all already have `verify_jwt = false`)
- No changes to non-cron edge functions


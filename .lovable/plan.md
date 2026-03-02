

# Fix Negotiation Request Edge Function Errors

## Issues Found

### 1. CORS Headers Mismatch (likely root cause)
The `send-negotiation-request` edge function uses an outdated CORS header set:
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
```
The Supabase JS SDK v2.55.0 sends additional headers (`x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`). When the browser sends a preflight OPTIONS request with these headers and the server doesn't allow them, the browser blocks the actual POST — resulting in a "non-2xx status code" error on the client.

### 2. 409 Conflict on Duplicate Negotiations
Several proposals already have active `awaiting_response` sessions. If the entrepreneur tries to send another negotiation on the same proposal, the function returns 409. The client-side hook handles this, but if CORS fails first, the user never sees the proper error message.

## Plan

### Step 1: Update CORS headers in `send-negotiation-request`
**File: `supabase/functions/send-negotiation-request/index.ts`** (line 10)

Change the `Access-Control-Allow-Headers` to include the full set:
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

### Step 2: Update CORS headers in `send-negotiation-response`
**File: `supabase/functions/send-negotiation-response/index.ts`** — same CORS fix.

### Step 3: Deploy both functions and verify
Deploy the updated edge functions and test by invoking the endpoint.

## Technical Detail
The Supabase JS client v2.55.0 sends platform metadata headers on every request. If the CORS preflight doesn't explicitly allow these headers, browsers reject the request entirely. This is a silent failure — the function never even executes, but the client sees a generic "non-2xx" error.


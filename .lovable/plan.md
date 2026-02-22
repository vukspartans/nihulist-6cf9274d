

# Fix: "Failed to load advisor data" Error on Advisor Dashboard

## Root Cause

The error occurs when the Supabase auth token refresh fails (HTTP 400 on `/auth/v1/token?grant_type=refresh_token`). When this happens:
1. The `user` object still exists in React state (from the previous session)
2. `fetchAdvisorData` fires because `user` is truthy
3. All Supabase queries fail because the auth token is invalid/expired
4. The generic `catch` block at line 520 shows "Failed to load advisor data"

This is a transient auth sync issue -- the browser has a stale session that can't refresh.

## Fix

Add a session verification check at the start of `fetchAdvisorData` before making any DB queries. If the session is invalid, skip fetching and let the auth state listener handle the redirect.

### File: `src/pages/AdvisorDashboard.tsx`

**In `fetchAdvisorData` (around line 170-175)**, after checking `if (!user)`, add a session verification:

```typescript
const fetchAdvisorData = async () => {
  if (!user) {
    console.debug('[AdvisorDashboard] No user, skipping fetch');
    return;
  }

  // Verify session is valid before making queries
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.warn('[AdvisorDashboard] No valid session, skipping fetch');
    return;
  }

  // ... rest of existing code
```

This follows the same RLS session sync pattern already used in `RFPDetails.tsx` and `SubmitProposal.tsx` (as documented in the architecture memory).

## Impact
- Prevents the error toast from showing when the session is stale
- The auth state listener will fire `SIGNED_OUT` or `TOKEN_REFRESHED`, which will either redirect the user to login or re-trigger the data fetch with a valid session
- No UI changes, just eliminates the false-positive error notification


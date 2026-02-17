

# Fix: Rate Limit Too Aggressive on Proposal Submission

## Root Cause

The client-side rate limiter (`checkRateLimit`) in `useProposalSubmit.ts` is configured with `maxRequests: 3` per `60000ms` (1 minute). Combined with the trigger bug (now fixed), vendors who retried after errors quickly got locked out with "Rate limit exceeded."

Even with the trigger fix, 3 per minute is too restrictive for a critical business action -- a vendor filling out a long form and hitting a validation error would burn through attempts fast.

## Fix

In `src/hooks/useProposalSubmit.ts`, increase the rate limit from **3 requests/minute** to **8 requests per 2 minutes**. This still prevents abuse but gives legitimate users room for retries after errors.

**Line ~97:**
```typescript
// Before
const rateLimitCheck = checkRateLimit(rateLimitKey, 3, 60000);

// After
const rateLimitCheck = checkRateLimit(rateLimitKey, 8, 120000);
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useProposalSubmit.ts` | Change rate limit from 3/60s to 8/120s |


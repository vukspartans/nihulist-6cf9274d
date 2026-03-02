

# Fix Outdated CORS Headers Across All Edge Functions

## Problem
18 edge functions (plus the shared `_shared/cron-auth.ts`) use the outdated CORS header:
```
"authorization, x-client-info, apikey, content-type"
```
Only `send-negotiation-request` and `send-negotiation-response` were already fixed. The outdated headers will cause silent preflight failures when the Supabase JS SDK v2.55.0 sends platform metadata headers.

## Files to Update (19 total)

All need `Access-Control-Allow-Headers` changed to:
```
"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

| # | File | Line |
|---|------|------|
| 1 | `_shared/cron-auth.ts` | 19 |
| 2 | `analyze-project-file/index.ts` | 9 |
| 3 | `analyze-proposal/index.ts` | 8 |
| 4 | `analyze-proposal-file/index.ts` | 9 |
| 5 | `bulk-create-advisors/index.ts` | 9 |
| 6 | `evaluate-proposals-batch/index.ts` | 13 |
| 7 | `extract-proposal-text/index.ts` | 6 |
| 8 | `extract-rfp-content/index.ts` | 7 |
| 9 | `get-advisors-data/index.ts` | 6 |
| 10 | `manage-users/index.ts` | 9 |
| 11 | `notify-proposal-approved/index.ts` | 12 |
| 12 | `notify-proposal-rejected/index.ts` | 12 |
| 13 | `notify-proposal-resubmitted/index.ts` | 12 |
| 14 | `notify-proposal-submitted/index.ts` | 12 |
| 15 | `notify-rfp-declined/index.ts` | 16 |
| 16 | `reject-proposal/index.ts` | 10 |
| 17 | `send-rfp-email/index.ts` | 12 |
| 18 | `sync-user-emails/index.ts` | 6 |
| 19 | `system-health-check/index.ts` | 5 |
| 20 | `update-advisors-data/index.ts` | 6 |

## Already Fixed (skip)
- `send-negotiation-request/index.ts`
- `send-negotiation-response/index.ts`

## Approach
Single-line replacement in each file — change only the `Access-Control-Allow-Headers` value. Then deploy all updated functions.


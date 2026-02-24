

# Email Infrastructure Audit -- Comprehensive Findings

## Executive Summary

After reviewing all 16 email-sending edge functions, 14 email templates, the notification queue system, and the config.toml, I found **3 critical bugs**, **2 architectural gaps**, and **3 moderate issues**.

---

## CRITICAL -- Functions That Are Broken Right Now

### 1. `reject-proposal` -- Dual React Instance (WILL CRASH)

**Status:** Broken. Uses `https://esm.sh/resend@2.0.0` (line 3) alongside `npm:@react-email/components@0.0.31`. This is the exact same bug we just fixed in `send-negotiation-request`. When this function renders the `ProposalRejectedEmail` template via `renderAsync`, it will throw:

```
Objects are not valid as a React child
```

**Fix:** Update lines 1-3:
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@4.0.0";
```
Also add the missing `import React from "npm:react@18.3.1"` -- currently absent, which means `renderAsync` has no React context at all.

### 2. `send-proposal-notification` -- DOES NOT SEND ANY EMAIL

**Status:** Stub function. Line 50 literally says `// TODO: Send email notification to entrepreneur`. It logs activity but **never sends an email**. Any code path invoking this function silently succeeds without notifying anyone.

**Fix:** Either remove this function and redirect callers to `notify-proposal-submitted`, or implement actual email sending.

### 3. `send-rfp-with-deadline` -- DOES NOT SEND ANY EMAIL

**Status:** Creates RFP invites in the database but **never calls Resend or any email service**. It doesn't even import Resend. Invites are created with status `'sent'` but no email is actually dispatched. This appears to be a legacy function superseded by `send-rfp-email`, but it's still in config.toml and may still be called.

---

## MODERATE -- Functions with Stale Dependencies

### 4. `bulk-create-advisors` -- Uses `esm.sh/resend@2.0.0`

Uses the old `https://esm.sh/resend@2.0.0` import. This function sends plain HTML (not React templates), so it won't crash from dual-React, but `resend@2.0.0` is outdated and may have bugs or missing features. Should be updated to `npm:resend@4.0.0` for consistency.

### 5. `manage-users` -- Uses outdated Deno/Supabase + `npm:resend@2.0.0`

Uses `deno.land/std@0.168.0` and `esm.sh/@supabase/supabase-js@2.39.3`. While it uses `npm:resend@2.0.0` (not esm.sh, so no dual-React crash), the Supabase client version is severely outdated (2.39.3 vs 2.55.0). Should be standardized.

---

## ARCHITECTURAL GAPS

### 6. Missing `config.toml` entries for 8 edge functions

The following functions exist in the codebase but have NO entry in `config.toml`:

| Function | Risk |
|---|---|
| `notify-proposal-approved` | Defaults to `verify_jwt = true` -- correct for user-invoked |
| `notify-proposal-rejected` | Same -- correct |
| `notify-proposal-submitted` | Same -- correct |
| `send-rfp-email` | Same -- correct |
| `notify-rfp-declined` | Same -- but called fire-and-forget from client, may fail without JWT in some edge cases |
| `bulk-create-advisors` | Same -- correct for admin-invoked |
| `manage-users` | Same -- correct for admin-invoked |
| `expire-rfps` / `expire-invites` | **PROBLEM** -- These are cron jobs. Without `verify_jwt = false` in config.toml, they default to `verify_jwt = true` and will reject cron requests that use `x-cron-secret` instead of JWT. |

### 7. No `expire-rfps` or `expire-invites` in config.toml

These cron-triggered functions need `verify_jwt = false` to work with the `validateCronRequest` pattern. Without it, **expired RFPs and invites are never cleaned up**.

---

## ARCHITECTURAL OBSERVATIONS (Lower Priority)

### 8. Duplicate rejection email paths

There are **two** functions that send rejection emails:
- `reject-proposal` -- Uses old imports, renders email inline, called from entrepreneur action
- `notify-proposal-rejected` -- Uses correct imports, separate notification function

These should be consolidated. Currently `reject-proposal` handles the DB mutation AND email sending, while `notify-proposal-rejected` is a standalone notifier. Having both creates maintenance burden and inconsistent behavior.

### 9. `send-proposal-notification` vs `notify-proposal-submitted`

Same duplication pattern. `send-proposal-notification` is a dead stub while `notify-proposal-submitted` is the working implementation. The stub should be removed.

---

## Proposed Fix Plan

### Phase 1: Fix Critical Bugs (Immediate)

1. **`reject-proposal/index.ts`** -- Update imports to standard pattern (`npm:resend@4.0.0`, add `React` import)
2. **`bulk-create-advisors/index.ts`** -- Update `Resend` import to `npm:resend@4.0.0`
3. **`config.toml`** -- Add missing entries for `expire-rfps` and `expire-invites` with `verify_jwt = false`

### Phase 2: Clean Up Dead Code

4. **`send-proposal-notification`** -- Either remove entirely or redirect to `notify-proposal-submitted`
5. **`send-rfp-with-deadline`** -- Audit callers; if superseded by `send-rfp-email`, mark as deprecated or remove

### Phase 3: Standardize

6. **`manage-users/index.ts`** -- Update Deno std and Supabase client versions
7. Add remaining missing `config.toml` entries for completeness

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/reject-proposal/index.ts` | Fix imports (lines 1-5) |
| `supabase/functions/bulk-create-advisors/index.ts` | Fix Resend import (line 3) |
| `supabase/config.toml` | Add `expire-rfps`, `expire-invites` entries |
| Deploy | `reject-proposal`, `bulk-create-advisors` |

---

## Technical Details

### Standard Import Pattern (all email functions must use this)

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@4.0.0";
// Only needed if using React Email templates:
import { renderAsync } from "npm:@react-email/components@0.0.31";
import React from "npm:react@18.3.1";
```

The key rule: **Never use `https://esm.sh/resend@*`** -- it bundles its own React, creating a dual-instance conflict when combined with `npm:react@18.3.1` used by `@react-email/components`.


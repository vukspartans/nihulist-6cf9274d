

# Fix: Negotiation Response Email - React Version Conflict

## Problem Confirmed

After deploying the previous ternary fix and testing end-to-end, the email **still fails** with:
```
Error: Objects are not valid as a React child (found: object with keys {$$typeof, type, key, ref, props, _owner, _store})
```

## Root Cause (Verified)

Comparing the **working** `notify-proposal-submitted` imports with the **broken** `send-negotiation-response`:

| Import | Working (notify-proposal-submitted) | Broken (send-negotiation-response) |
|--------|-------------------------------------|-------------------------------------|
| std | `https://deno.land/std@0.190.0/...` | `https://deno.land/std@0.168.0/...` |
| supabase-js | `https://esm.sh/@supabase/supabase-js@2.55.0` | `https://esm.sh/@supabase/supabase-js@2.49.1` |
| Resend | `npm:resend@4.0.0` | `https://esm.sh/resend@2.0.0` |

The `esm.sh` URL for Resend bundles its own React internally, creating a **dual React instance** conflict. JSX elements created by `npm:react@18.3.1` are treated as invalid objects by the React bundled inside the esm.sh Resend package.

## Fix

### File: `supabase/functions/send-negotiation-response/index.ts`

Update lines 1-3 to match the working function's import style:

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@4.0.0";
```

These three changes align the imports with the proven working pattern from `notify-proposal-submitted`.

### Deployment

Redeploy `send-negotiation-response` after the import fix.

### Verification

After deploying, we already have a pending negotiation session to re-test. We can either:
1. Create another negotiation request from the entrepreneur and have the vendor respond again
2. Check the edge function logs to confirm `negotiation_response_email_sent` appears instead of `_failed`


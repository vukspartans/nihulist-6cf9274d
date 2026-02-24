

# Fix: Negotiation Request Email Failing with React Rendering Error

## Root Cause

The activity log confirms emails are failing with:
```
Error: Objects are not valid as a React child (found: object with keys {$$typeof, type, key, ref, props, _owner, _store})
```

This is a **duplicate React instance** issue. The `send-negotiation-request` function uses outdated import versions that create conflicting React instances during email rendering:

**Broken** (`send-negotiation-request/index.ts` line 1-3):
```
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
```

**Working** (`send-negotiation-response/index.ts` line 1-3):
```
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@4.0.0";
```

The key difference: Resend imported via `https://esm.sh/resend@2.0.0` brings its own React, conflicting with the `npm:react@18.3.1` import. The fix (already applied to `send-negotiation-response`) uses `npm:resend@4.0.0`.

## Fix

Update the first 3 import lines of `supabase/functions/send-negotiation-request/index.ts` to match the working pattern:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@4.0.0";
```

Then redeploy the `send-negotiation-request` edge function.

## Regarding the "click of a button" Navigation

The email template already includes a CTA button pointing to `https://billding.ai/negotiation/${session.id}`. The response URL and email template are correctly configured -- the only issue is the email never sends due to the React error.

## Verification

After deploying, trigger a negotiation request and check the activity log. Instead of `negotiation_request_email_failed`, you should see `negotiation_request_email_sent`.


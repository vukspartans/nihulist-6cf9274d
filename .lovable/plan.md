

# Fix Hebrew Character Encoding in Negotiation Emails

## Root Cause

Two issues cause the black diamond question marks (�) around "יועץ":

1. **Conflicting Content-Type header**: Both `send-negotiation-request` and `send-negotiation-response` manually set `headers: { 'Content-Type': 'text/html; charset=UTF-8' }` in the Resend `send()` call. Resend automatically sets this header when the `html` parameter is used. The manual override creates a duplicate/conflicting MIME header that corrupts encoding in some email clients.

2. **Missing zero-width character sanitization**: The `sanitize` function strips Hebrew punctuation (maqaf, geresh, gershayim) but does not strip invisible Unicode characters (LRM U+200E, RLM U+200F, BOM U+FEFF, zero-width spaces) that can surround Hebrew text from database values or copy-paste. These invisible bytes cause encoding corruption in email rendering.

3. **Team member emails unsanitized**: The team member email loop in `send-negotiation-request` (line 479) sends the subject without running it through `sanitize()`.

## Fix — 2 files

### File 1: `supabase/functions/send-negotiation-request/index.ts`

- **Remove** `headers: { 'Content-Type': 'text/html; charset=UTF-8' }` from the `resend.emails.send()` call (line 443). Resend handles this automatically.
- **Expand** the `sanitize` function to also strip zero-width characters:
  ```ts
  const sanitize = (s: string) => s
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')  // zero-width chars
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u05BE/g, '-')
    .replace(/\u05F3/g, "'")
    .replace(/\u05F4/g, '"');
  ```
- **Apply** `sanitize()` to team member email subject (line 479).

### File 2: `supabase/functions/send-negotiation-response/index.ts`

- **Remove** `headers: { 'Content-Type': 'text/html; charset=UTF-8' }` from the `resend.emails.send()` call (line 248).
- **Expand** the `sanitize` function identically to strip zero-width characters.

## Files Modified: 2
- `supabase/functions/send-negotiation-request/index.ts`
- `supabase/functions/send-negotiation-response/index.ts`


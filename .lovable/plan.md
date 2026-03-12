

# Fix: Hebrew Character Encoding in RFP Email Template

## Problem
Hebrew hyphens and special characters render as `?` in RFP invitation emails. The root cause is twofold:

1. **Missing `<meta charset>` in email head**: The `EmailLayout` uses `<Head />` from react-email which *should* auto-inject `charset=UTF-8`, but some email clients ignore this. An explicit `<meta>` tag ensures reliability.

2. **Incomplete sanitize function**: The `sanitize()` in `send-rfp-email/index.ts` handles general Unicode dashes (U+2010–U+2015) but misses **Hebrew-specific punctuation** that commonly appears in project names and types:
   - `U+05BE` — Hebrew maqaf (־) — the native Hebrew hyphen, used in terms like `פינוי־בינוי`
   - `U+05F3` — Hebrew geresh (׳)
   - `U+05F4` — Hebrew gershayim (״) — used in `תמ״א`
   - `U+FB1D–U+FB4F` — Hebrew presentation forms that some databases store

3. **Unsanitized email subject**: The `subject` field on `resend.emails.send()` passes `project.name` raw without sanitization, so any special characters in the project name corrupt the subject line.

4. **Missing `headers` on Resend call**: Resend accepts a `headers` option where we can explicitly set `Content-Type` charset to guarantee UTF-8.

## Changes

### File 1: `supabase/functions/_shared/email-templates/layout.tsx`

Add explicit charset meta tag inside `<Head>`:

```tsx
<Head>
  <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
</Head>
```

### File 2: `supabase/functions/send-rfp-email/index.ts`

**2a. Expand `sanitize` to handle Hebrew-specific characters** (lines 46-63):

Add these replacements:
```typescript
.replace(/\u05BE/g, '-')    // Hebrew maqaf ־ → ASCII hyphen
.replace(/\u05F3/g, "'")    // Hebrew geresh ׳ → apostrophe  
.replace(/\u05F4/g, '"')    // Hebrew gershayim ״ → double quote
```

**2b. Sanitize the email subject** (line 305):

```typescript
subject: sanitize(`הזמנה להגשת הצעת מחיר: ${project.name}`),
```

**2c. Add explicit UTF-8 headers to Resend call** (line 302-312):

Add `headers` to the `resend.emails.send()` options:
```typescript
headers: {
  'Content-Type': 'text/html; charset=UTF-8',
},
```

### File 3: Other email edge functions (consistency pass)

Apply the same Hebrew-character sanitize expansions to the sanitize functions in:
- `supabase/functions/notify-proposal-rejected/index.ts` (line ~100)
- `supabase/functions/notify-proposal-resubmitted/index.ts` (line ~120)
- `supabase/functions/send-negotiation-request/index.ts` (if it has a sanitize function)
- `supabase/functions/send-negotiation-response/index.ts` (if it has a sanitize function)

Each gets the 3 additional `.replace()` lines for U+05BE, U+05F3, U+05F4, and the subject line sanitization.

## Summary
- 1 layout file: add explicit charset meta
- 1 primary edge function: expand sanitize, sanitize subject, add headers
- ~4 other edge functions: same sanitize expansion for consistency


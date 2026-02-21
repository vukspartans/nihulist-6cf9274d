

# Fix: Negotiation Response Email Failing (No Email on Counter-Offers)

## Bug Found

The activity log from today shows:

```
negotiation_response_email_failed
Error: Objects are not valid as a React child (found: object with keys 
{$$typeof, type, key, ref, props, _owner, _store})
```

**Impact**: When an advisor submits a counter-offer, the entrepreneur does NOT receive an email notification. Initial proposal emails work fine -- only the negotiation response email is broken.

## Root Cause

The `NegotiationResponseEmail` template at line 74 uses a conditional JSX expression inside a `<table>`:

```tsx
{priceDiff > 0 && (
  <tr>...</tr>
)}
```

In React Email's `renderAsync` (v0.0.31), rendering `false` as a direct child inside an HTML `<table>` element can produce the "Objects are not valid as a React child" error. The `react-email` renderer struggles with falsy values in certain HTML contexts.

## Fix

### File: `supabase/functions/_shared/email-templates/negotiation-response.tsx`

Replace the short-circuit conditional `{priceDiff > 0 && (...)}` with a proper ternary that returns `null` instead of `false`:

```tsx
{priceDiff > 0 ? (
  <tr>
    <td style={labelCell}>...</td>
    <td style={savingsCell}>...</td>
  </tr>
) : null}
```

### File: `supabase/functions/send-negotiation-response/index.ts`

Add safety coercion for numeric values to prevent any edge cases where `previousPrice` or `newPrice` might not be a plain number:

```ts
previousPrice: Number((session.proposal as any).price) || 0,
newPrice: Number(newTotal) || 0,
```

### Deployment

Redeploy the `send-negotiation-response` edge function after making the fix.

### Verification

After deploying, test by having an advisor submit a counter-offer and checking:
1. The activity log shows `negotiation_response_email_sent` (not `_failed`)
2. The entrepreneur receives the email


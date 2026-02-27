

# Fix: Add Unicode sanitization to ALL email-sending edge functions

## Problem
The `sanitize` function (replacing Unicode dashes with ASCII hyphens) was only added to `send-rfp-email`. All other email functions pass raw strings to `renderAsync`, causing question marks to appear in emails whenever project names, advisor types, or other fields contain Unicode dashes.

## Affected Functions (7 total)

Each function needs a `sanitize` helper added, and all string props passed to `renderAsync` wrapped with it:

1. **`send-negotiation-request/index.ts`** — `projectName`, `advisorCompany`, `entrepreneurName`, `globalComment`
2. **`send-negotiation-response/index.ts`** — `projectName`, `advisorCompany`, `entrepreneurName`, `consultantMessage`
3. **`notify-proposal-submitted/index.ts`** — `projectName`, `advisorCompany`, `advisorType`, `entrepreneurName`
4. **`notify-proposal-approved/index.ts`** — `projectName`, `advisorCompany`, `entrepreneurName`, `entrepreneurNotes`
5. **`notify-proposal-resubmitted/index.ts`** — `projectName`, `advisorCompany`, `advisorType`, `entrepreneurName`
6. **`notify-rfp-declined/index.ts`** — `projectName`, `advisorCompany`, `advisorType`, `entrepreneurName`
7. **`reject-proposal/index.ts`** — `projectName`, `advisorCompany`, `rejectionReason`
8. **`notify-proposal-rejected/index.ts`** — `projectName`, `advisorCompany`, `rejectionReason`

## Implementation

Add this shared sanitize helper before each `renderAsync` call:

```typescript
const sanitize = (s: string) => s
  .replace(/[\u2010-\u2015]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"');
```

This also handles smart quotes (`'` `'` `"` `"`) which can similarly corrupt.

Wrap every string prop in the `React.createElement` / template call with `sanitize()`.

## Deployment
All 8 functions will be redeployed after changes.


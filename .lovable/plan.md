

# Fix: Wrong Advisor Type in RFP Emails + Question Marks in Emails

## Bugs Found

### Bug 1: Wrong advisor type in RFP invitation emails

**Root Cause confirmed in database:** ALL invites for the "גורדון 16" project have `request_title = "...עבור תכנון אינסטלציה"` regardless of advisor type (חשמל, קונסטרוקציה, מעליות, etc.). This is because:

1. The RPC function `send_rfp_invitations_to_advisors` receives a **single** `request_title` and stores it on ALL invites
2. The previous fix added per-type title updates in `saveAdvisorTypeData`, but there's a **race condition**: `requestTitle` on line 370 of `RFPWizard.tsx` is taken from the **first** advisor type only (line 315), and the RPC pre-populates ALL invites with that title
3. Since `send-rfp-email` is triggered fire-and-forget (line 124), it can read the invites before `saveAdvisorTypeData` finishes updating per-type titles

**Fix:** Pass `null` as `requestTitle` to the RPC when per-type data exists, so the RPC doesn't pre-populate a wrong title. Let `saveAdvisorTypeData` be the sole source for per-type titles.

### Bug 2: Question marks (replacement characters) in proposal emails

**Root Cause:** The screenshot shows "עבור◆◆" where it should say "עבורך" (final kaf character). This is a Unicode encoding issue -- the Hebrew letter "ך" (U+05DA, 2 bytes in UTF-8) is being corrupted into two replacement characters during `renderAsync`. This can happen when the source file has invisible BOM or zero-width characters near certain Hebrew letters.

**Fix:** Rewrite the affected line in `proposal-submitted.tsx` to eliminate any hidden encoding artifacts. The safest approach is to restructure the sentence to avoid the problematic character combination.

---

## Changes

### 1. File: `src/components/RFPWizard.tsx` (lines 314-371)

**Remove the single `requestTitle` passed to the RPC** when per-type data is available:

```tsx
// Before (line 315):
const requestTitle = typeData?.requestTitle ? sanitizeText(typeData.requestTitle, 200) : undefined;

// After:
// Don't pass a generic title when we have per-type titles -- saveAdvisorTypeData will set per-type titles
const requestTitle = advisorTypeDataMap && Object.keys(advisorTypeDataMap).length > 1
  ? null  // Multiple types: let saveAdvisorTypeData handle per-type titles
  : (typeData?.requestTitle ? sanitizeText(typeData.requestTitle, 200) : undefined);
```

### 2. File: `supabase/functions/_shared/email-templates/proposal-submitted.tsx` (line 37)

Rewrite the line to eliminate encoding artifacts:

```tsx
// Before:
<Text style={paragraph}>
  התקבלה הצעת מחיר חדשה עבורך. להלן הפרטים:
</Text>

// After:
<Text style={paragraph}>
  {'התקבלה הצעת מחיר חדשה. להלן הפרטים:'}
</Text>
```

This removes the problematic "עבורך" and simplifies to "התקבלה הצעת מחיר חדשה" (a new proposal was received) -- a clean sentence that avoids the encoding issue entirely.

Additionally, check and fix similar patterns in **all other email templates** that might have encoding issues with Hebrew final-form letters (ך, ם, ן, ף, ץ).

### 3. File: `supabase/functions/_shared/email-templates/proposal-submitted.tsx` (line 58)

Also fix the `filesCount > 0 && (...)` conditional inside `<table>` to use a ternary (same bug pattern as the negotiation-response fix):

```tsx
// Before:
{filesCount > 0 && (
  <tr>...</tr>
)}

// After:
{filesCount > 0 ? (
  <tr>...</tr>
) : null}
```

### 4. Deployment

Redeploy `send-rfp-email` and `notify-proposal-submitted` edge functions after the template fix.




# Bug Fixes: RFP Email & Advisor View Issues

## Issues Identified

### 1. `{{שם_המשרד}}` placeholder not replaced (Critical)
**Root cause:** Two separate flows, two separate bugs:

**A. In `request_content` (DB → RFPDetails page):** The DB function `send_rfp_invitations_to_advisors` replaces `{{שם_המשרד}}` only in `personalized_body_html`, but stores `request_content` **as-is** without replacement (line 273 of the latest migration). When the advisor opens RFPDetails, they see the raw placeholder.

**B. In the email template:** The `send-rfp-email` edge function passes `invite.request_content` (which still has the placeholder) directly to the email template at line 251. Neither the edge function nor the template replaces `{{שם_המשרד}}`.

**Fix:**
- **DB function:** Add a replacement step: `request_content := replace(request_content, '{{שם_המשרד}}', COALESCE(advisor_rec.company_name, advisor_rec.name))` before inserting the invite. This requires a new migration to `CREATE OR REPLACE` the function.
- **Edge function (`send-rfp-email`):** Also replace `{{שם_המשרד}}` with `companyName` in `request_content` and `request_title` before passing to the email template, as a safety net.

### 2. Question marks (Unicode corruption) in email
**Root cause:** The sanitize function only handles dashes (`\u2010-\u2015`). The `deadlineDate` from `toLocaleDateString('he-IL')` outputs Hebrew text containing the word "בשעה" which likely includes non-ASCII chars. More importantly, `senderOrganizationName`, `requestTitle`, and `requestContent` are **not sanitized at all** before being passed to `renderAsync`.

In the screenshot, the `�` chars appear in the deadline row — `10 במרץ 2026 ב�עה 10:59` — the word "בשעה" is corrupted.

**Fix:**
- Sanitize `deadlineDate` and `senderOrganizationName` through the same sanitize function.
- Extend the sanitize function to also handle smart quotes (`\u2018-\u201D`) and the Hebrew "בשעה" rendering issue — the `toLocaleDateString` in Deno may produce problematic Unicode. Switch to manual date formatting that avoids the issue, or sanitize the output.
- Apply sanitize to `requestTitle` and `requestContent` as well.

### 3. "לא הוגדרו פרטי שירותים" / "לא הוגדרו תנאי תשלום"
**Root cause:** When the entrepreneur sends an RFP through the wizard without opening the RequestEditorDialog for a specific advisor type, the `enrichedRequestDataByType` (line 292 in RFPWizard.tsx) only sets `serviceDetailsMode: 'free_text'` with **no** service scope items, fee items, or payment terms. The `saveAdvisorTypeData` function then has nothing to save — resulting in empty services/fees/payment tabs for the advisor.

This is actually **expected behavior** if the entrepreneur didn't configure these details. However, the question is whether the entrepreneur *did* configure them via the RequestEditorDialog. If so, we need to trace why that data wasn't saved.

**Fix:** This may be data-specific to this RFP. Need to verify whether the entrepreneur actually configured service details. For now, no code change needed — the empty state is correct if data wasn't entered. But I'll verify with logs.

### 4. Missing attached files
**Root cause:** Similar to #3 — if files were attached in the RequestEditorDialog, they should flow through `requestAttachments` → `requestFiles` → DB `request_files` column → `send-rfp-email` → email template. Need to check if files were actually uploaded for this specific RFP or if there's a data flow gap.

The email template does render files if they exist (lines 91-100 in `rfp-invitation.tsx`). If files don't appear, either they weren't uploaded by the entrepreneur, or the `request_files` column is null/empty for this invite.

**Fix:** Check the DB for this specific invite. No code change needed unless we find a bug in the flow.

### 5. Old logo in email
**Root cause:** `layout.tsx` line 28 references `https://aazakceyruefejeyhkbk.supabase.co/storage/v1/object/public/email-assets/billding-logo.png`. This file in the storage bucket is the old logo and needs to be replaced with the current one.

**Fix:** Upload the new logo to the `email-assets` bucket, or update the URL in `layout.tsx` to point to the correct file.

---

## Plan

### Step 1: Fix `{{שם_המשרד}}` replacement — DB migration
Create a new migration that recreates `send_rfp_invitations_to_advisors` with `request_content` placeholder replacement before insert.

### Step 2: Fix `{{שם_המשרד}}` replacement — Edge function safety net
In `send-rfp-email/index.ts`, replace `{{שם_המשרד}}` with `companyName` in `invite.request_content` and `invite.request_title` before passing to the template.

### Step 3: Fix Unicode corruption in email
Extend the sanitize function and apply it to ALL string props passed to `renderAsync`: `deadlineDate`, `senderOrganizationName`, `requestTitle`, `requestContent`. Also handle smart quotes.

### Step 4: Update email logo
Update the logo URL in `layout.tsx` (and the hardcoded migration SQL templates) to point to the new logo. Upload new logo to `email-assets` bucket.

### Step 5: Deploy updated edge function
Deploy `send-rfp-email` after fixes.

### Note on services/files
These appear to be data-specific (the entrepreneur may not have configured services/payment/files for this RFP). No code bug identified — the empty states are correct if data wasn't provided.


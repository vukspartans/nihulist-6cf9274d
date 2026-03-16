

# Fix: Email Template "הצעתך אושרה" — Remove Timeline, Add Domain Field

## Summary

The "Proposal Approved" email template displays a "לוח זמנים" (timeline) field that is irrelevant, and is missing a "תחום" (domain/consultant type) field. Both the email template and the edge function that calls it need updating.

## Changes — 2 files

### 1. `supabase/functions/_shared/email-templates/proposal-approved.tsx`

- **Remove** the `timelineDays` prop and the `<tr>` rendering "לוח זמנים" (lines 14, 54-57)
- **Add** `advisorType` prop (string)
- **Add** a new `<tr>` for "תחום" displaying `advisorType`, placed after the "אושר על ידי" row

### 2. `supabase/functions/notify-proposal-approved/index.ts`

- **Fetch `advisor_type`** from `rfp_invites` table by joining through the proposal's `rfp_invite_id`:
  ```sql
  proposals → rfp_invite_id → rfp_invites.advisor_type
  ```
  Update the proposal select query (line 57) to include `rfp_invite_id`, then fetch `advisor_type` from `rfp_invites`.
- **Remove** `timelineDays` from the `createElement` props
- **Add** `advisorType` to the `createElement` props, with fallback to `'יועץ'`

## Result

The email will show: פרויקט, אושר על ידי, מחיר, תחום — without the timeline field.


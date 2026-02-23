

# Extend RFP Deadline + "Prolong" Button Feature

## Part 1: Extend "א.ד. גורדון 16, ת"א" Deadline by 48 Hours

The RFP batch `8a9650b3` (subject: "בקשה להצעת מחיר - גורדון 16, ת"א") currently has `deadline_at = 2026-02-23 19:01:28` -- expiring tonight. There are ~27 invites still in `sent` or `opened` status that haven't submitted yet.

**Action:** Update all non-terminal invites for this RFP to extend by 48 hours (new deadline: 2026-02-25 19:01:28).

```sql
UPDATE rfp_invites
SET deadline_at = deadline_at + interval '48 hours',
    updated_at = now()
WHERE rfp_id = '8a9650b3-36f0-43a7-9de8-427b5f62ed2f'
  AND status NOT IN ('submitted', 'declined', 'expired');
```

This only extends invites that are still actionable (sent, opened, in_progress, pending). Already-submitted, declined, or expired invites remain unchanged.

---

## Part 2: "Prolong Deadline" Button -- Feasibility Assessment

**Difficulty: Low-Medium (2-3 hours of work)**

The infrastructure is already well-suited for this feature:

### What already exists
- `deadline_at` column on `rfp_invites` is a simple timestamp -- extending it is just an UPDATE
- `DeadlineCountdown` component already calculates `isCritical` (under 24 hours) -- this is exactly where the button would appear
- `SentRFPsTab` is the entrepreneur's view of sent RFPs, grouped by advisor type -- perfect place to add the button
- RLS policies already allow entrepreneurs to update their project's RFP invites (via `is_project_owned_by_user`)
- The `expire_old_rfp_invites` DB function and `expire-rfps` edge function handle expiration -- they check `deadline_at`, so extending it automatically prevents expiration

### What needs to be built

1. **"Extend Deadline" button in `SentRFPsTab.tsx`**
   - Show a button (e.g., "הארך מועד אחרון") next to each advisor type group header when the deadline is under 24 hours
   - Use the existing `isCritical` logic from `DeadlineCountdown` (< 24 hours)
   - Opens a small dialog asking how many hours/days to extend (default: 48 hours)

2. **Supabase RPC function or direct update**
   - A simple `extend_rfp_deadline` RPC that takes `rfp_id`, `advisor_type`, and `extension_hours`
   - Updates all non-terminal invites for that RFP + advisor type
   - Returns the new deadline
   - Alternatively, do a direct `.update()` call from the client (simpler, RLS already covers it)

3. **Optional: Notification to advisors**
   - Send an email to affected advisors notifying them of the extended deadline
   - Could reuse the existing `send-rfp-email` edge function with a new template

### No database schema changes needed
The `deadline_at` column already exists. No migrations required.

### Suggested UX
- The button appears as a small "הארכת מועד" link/button next to the deadline display in `SentRFPsTab`
- Only visible when deadline < 24 hours and status is not terminal
- Clicking opens a confirmation dialog with a dropdown for extension duration (24h, 48h, 72h, 1 week)
- After confirming, updates the deadline and shows a success toast


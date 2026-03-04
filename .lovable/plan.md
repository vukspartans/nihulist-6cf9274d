

# Extend Deadline Button — Bug Fixes

## Bug 1: All invites get the same deadline (data corruption risk)

The dialog computes the new deadline from `currentDeadline` (the **earliest** deadline in the group). But different invites within the same group may have different deadlines (e.g., if one was extended before). The current update sets ALL matching invites to `earliest + extension`, which could **move later deadlines backward**.

**Fix:** Instead of setting a single computed deadline, extend each invite's own deadline by the chosen hours. This requires switching from a single `.update()` to per-invite updates, or using an RPC/raw SQL approach. The simplest fix: change the Supabase update to add the extension relative to each row's current `deadline_at` rather than a hardcoded value. Since Supabase JS doesn't support column-relative updates, use a small RPC or update each invite individually.

Pragmatic approach: fetch all matching invite IDs + their current deadlines first, then batch-update each with its own new deadline.

## Bug 2: Button only visible when deadline < 24 hours away

Already discussed — the button should always be available when there are active (non-terminal) invites with a deadline. The 24-hour restriction is confusing and prevents legitimate use.

**Fix:** Change `isGroupDeadlineCritical` to simply check if the group has any active invite with a future deadline (remove the 24h threshold). Rename it to something like `canExtendDeadline`.

## Plan

| # | Fix | File |
|---|-----|------|
| 1 | Always show button when group has active invites with a future deadline | `SentRFPsTab.tsx` — rename + relax `isGroupDeadlineCritical` |
| 2 | Extend each invite relative to its own deadline | `ExtendDeadlineDialog.tsx` — fetch invite deadlines, update per-invite |

Both changes are in frontend only, no migration needed.


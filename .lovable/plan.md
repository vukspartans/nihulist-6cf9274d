

# Advisor Dashboard: Tab Reorder, Conditional Visibility, and Alpha Badges

## Changes Overview

### 1. Reorder Tabs
Move "משימות" (Tasks) and "תשלומים" (Payments) tabs to the **left side** (end of the tab list in RTL), with Tasks to the right of Payments.

**Current order (RTL, right-to-left):**
```
משימות | הזמנות להצעת מחיר | ההצעות שלי | משא ומתן | תשלומים
```

**New order:**
```
הזמנות להצעת מחיר | ההצעות שלי | משא ומתן | משימות | תשלומים
```

### 2. Conditionally Show Tasks and Payments Tabs

Only display these tabs when the advisor has been **recruited to at least one project** (i.e., has at least one proposal with status `accepted`). Without recruitment, these features have no data to show.

- Derive a boolean: `const isRecruited = proposals.some(p => p.status === 'accepted')`
- If not recruited, render a 3-column grid instead of 5-column, and hide both tabs + their content
- Reset activeTab to `rfp-invites` if user was on tasks/payments and becomes un-recruited (edge case)

### 3. Add Alpha Banners

Inside **both** `TabsContent` for Tasks and Payments, add a subtle banner at the top:

```
[flask icon] פיצ'ר זה נמצא בגרסת אלפא -- ייתכנו שינויים ושיפורים
```

Styled as a soft amber/yellow info bar to indicate work-in-progress without being alarming.

### 4. Console Log Finding

The console shows `AuthApiError: Invalid Refresh Token: Refresh Token Not Found` -- this is a standard token expiry error when switching between accounts or after session timeout. The Supabase Postgres logs show zero errors. No actionable backend issues found on the advisor side.

## Technical Details

### File: `src/pages/AdvisorDashboard.tsx`

**Tab reorder (lines 1014-1039):**
- Move the Tasks and Payments `TabsTrigger` entries after Negotiations
- Conditionally render them based on `isRecruited`
- Adjust `grid-cols-5` to dynamic: `grid-cols-3` when not recruited, `grid-cols-5` when recruited

**Conditional logic (around line 145):**
- Add `isRecruited` derived from proposals state
- Guard the TabsContent blocks for tasks/payments

**Alpha banners (lines 1042-1048):**
- Add a styled alert banner inside each TabsContent for tasks and payments
- Use Flask icon from lucide-react with amber styling


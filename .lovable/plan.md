

# Bug Fix: Decline RFP fails with ENUM error

## Problem
The `DeclineRFPDialog` uses Hebrew strings as radio button values (e.g., "עומס עבודה גבוה") and passes them directly via `onDecline(reason)`. The database column `rfp_invites.decline_reason` is typed as `decline_reason_type` enum with values: `no_capacity`, `outside_expertise`, `timeline_conflict`, `budget_mismatch`, `other`.

`AdvisorDashboard` has a Hebrew-to-enum mapping but `RFPDetails` does not — it passes the Hebrew string straight to `declineRFP()`, causing the ENUM error.

## Fix

**File: `src/components/DeclineRFPDialog.tsx`** — Move the mapping into the dialog itself so all consumers get the correct enum value.

1. Change `DECLINE_REASONS` from a plain string array to a mapped structure with `label` (Hebrew) and `value` (enum):
```typescript
const DECLINE_REASONS = [
  { label: 'לא רלוונטי למומחיות שלי', value: 'outside_expertise' },
  { label: 'עומס עבודה גבוה', value: 'no_capacity' },
  { label: 'מיקום הפרויקט רחוק מדי', value: 'other' },
  { label: 'תקציב נמוך מדי', value: 'budget_mismatch' },
  { label: 'לוח זמנים לא מתאים', value: 'timeline_conflict' },
  { label: 'אחר', value: 'other' },
];
```

2. Update the RadioGroup to use `value` as the radio value and `label` as the display text.

3. The `onDecline` callback now sends the enum value directly.

**File: `src/pages/AdvisorDashboard.tsx`** — Remove the now-redundant `reasonMap` from `handleDeclineConfirm` and pass the reason directly to `declineRFP`.


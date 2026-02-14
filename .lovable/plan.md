

# Fix: Payment Request Status Constraint

## Problem

Same pattern as the milestone fix. The `valid_request_status` check constraint on `payment_requests` only allows:

```text
'prepared', 'submitted', 'in_accounting', 'awaiting_payment', 'paid', 'rejected'
```

But the approval chain defined in `payment_status_definitions` uses these codes:

```text
'prepared', 'submitted', 'professionally_approved', 'budget_approved', 'awaiting_payment', 'paid', 'rejected'
```

When the entrepreneur approves a submitted request, it tries to set status to `professionally_approved`, which the constraint rejects.

## Fix

A single database migration to replace the check constraint with a union of all values:

```text
DROP the old constraint: valid_request_status
ADD a new constraint allowing: 'prepared', 'submitted', 'in_accounting', 'professionally_approved', 'budget_approved', 'awaiting_payment', 'paid', 'rejected'
```

## No Code Changes Required

This is purely a database constraint fix -- the front-end and approval chain already use the correct codes.




# Fix: Payment Milestone Status Constraint

## Problem

When you mark a task as "Done", the database trigger `trg_auto_unlock_milestone` tries to set the linked payment milestone's status to `'due'`. However, a check constraint `valid_milestone_status` only allows these values:

```text
'pending', 'eligible', 'invoiced', 'paid'
```

The value `'due'` is rejected, causing the entire task update to fail with "לא ניתן לעדכן את המשימה".

## Root Cause

The check constraint was created with a different set of statuses than what the application code and the trigger function actually use. The app uses: `'pending', 'due', 'paid', 'overdue'`.

## Fix

A single database migration to replace the check constraint with the correct allowed values:

```text
DROP the old constraint: valid_milestone_status
ADD a new constraint allowing: 'pending', 'due', 'eligible', 'invoiced', 'paid', 'overdue'
```

This is a union of both the old and new status values to avoid breaking anything.

## No Code Changes Required

The front-end code already expects `'due'` as a valid status -- this is purely a database constraint fix.

## After the Fix

Marking "בדיקת היתכנות תכנונית" as Done will:
1. Update the task status to `completed`
2. The trigger will set Milestone A to `due`
3. The vendor's "New Payment Request" button will become enabled

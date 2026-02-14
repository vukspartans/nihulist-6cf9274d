

# Fix: "invalid input syntax for type date" Error

## Problem
When saving a task with empty date fields, empty strings (`""`) are sent to Supabase instead of `null`. PostgreSQL rejects `""` as an invalid date value (error code 22007).

## Root Cause
In `useProjectTasks.ts`, both `createTask` and `updateTask` pass date fields directly without converting empty strings to `null`. The form stores empty dates as `""` (from the HTML date input), but PostgreSQL date columns require either a valid date string or `null`.

## Fix

### `src/hooks/useProjectTasks.ts`
Add a small helper to convert empty strings to `null`, then apply it to all four date fields in both `createTask` and `updateTask`:

```typescript
const emptyToNull = (val: string | undefined | null) => val || null;
```

Apply to these fields in both functions:
- `planned_start_date`
- `planned_end_date`
- `actual_start_date`
- `actual_end_date`

Also apply to other string fields that map to nullable columns: `description`, `phase`, `assigned_advisor_id`, `block_reason`, `notes`.

This is a one-file fix with no UI changes needed.

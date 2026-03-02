
# Update Vendor Email: info@agasi-rimon.co.il → Office@agasi-rimon.co.il

## User Found
- **Name**: אביגיל נוי
- **user_id**: `dc6f0a4b-7f3d-4e3b-852f-214653387ee1`
- **Current email**: info@agasi-rimon.co.il
- **New email**: Office@agasi-rimon.co.il

## What Needs to Change

Two places store the email:
1. **`auth.users`** — Supabase auth table (used for login). Requires the Admin API (`supabaseAdmin.auth.admin.updateUserById`).
2. **`profiles`** table — application-level email field.

## Plan

### 1. Add `update_email` action to `manage-users` edge function
In `supabase/functions/manage-users/index.ts`, add a new `else if (action === 'update_email')` branch before the final `else` block:
- Accept `userId` and `newEmail`
- Call `supabaseAdmin.auth.admin.updateUserById(userId, { email: newEmail })`
- Update `profiles.email` where `user_id = userId`
- Return success

### 2. Deploy and invoke the function
- Deploy the updated edge function
- Call it with `{ action: 'update_email', userId: 'dc6f0a4b-...', newEmail: 'Office@agasi-rimon.co.il' }`

### 3. Verify
- Query the profiles table to confirm the email was updated

## Technical Details
- The edge function already has admin auth checks and service-role access, so the new action inherits the same security
- Only admins can invoke this (same guard as create/delete)
- No database migration needed — just an edge function code change + a data update



# Enhanced Admin User Management — Three-Dot Menu with Edit, Reset Password, and More

## Current State
The Users Management page has inline buttons for "Manage Roles" and "Delete" per row. There is no way to edit a user's name, email, phone, or send a password reset from the admin panel. The edge function `manage-users` supports `create`, `delete`, and `update_email` actions but lacks `update_profile` and `reset_password`.

## Plan

### 1. Add new actions to `manage-users` edge function
**File: `supabase/functions/manage-users/index.ts`**

Add two new action branches:

- **`update_profile`**: Accepts `userId`, `name`, `email`, `phone`. Updates `profiles` table fields. If email changed, also calls `supabaseAdmin.auth.admin.updateUserById` to sync auth email (reuses existing `update_email` logic).
- **`reset_password`**: Accepts `userId`. Looks up the user's email via `supabaseAdmin.auth.admin.getUserById`, then calls `supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email })` to generate a password reset link. Sends the reset link via Resend email to the user.

### 2. Replace inline buttons with a DropdownMenu (three-dot menu)
**File: `src/pages/admin/UsersManagement.tsx`**

Replace the actions column's inline buttons with a `DropdownMenu` triggered by a `MoreHorizontal` icon button. Menu items:

- **עריכת פרטים** (Edit Details) — opens an Edit User dialog
- **נהל הרשאות** (Manage Roles) — opens existing role dialog
- **שלח איפוס סיסמה** (Send Password Reset) — triggers reset with confirmation
- **מחק משתמש** (Delete User) — existing delete with confirmation via `AlertDialog`

### 3. Add Edit User dialog
**File: `src/pages/admin/UsersManagement.tsx`**

New dialog with fields: Name, Email, Phone. Pre-populated from `selectedUser`. On save, calls `manage-users` with `action: 'update_profile'`. All operations go through the edge function (server-side) — no direct client-side profile updates, keeping the admin auth check enforced.

### 4. Add Reset Password mutation
**File: `src/pages/admin/UsersManagement.tsx`**

New mutation that calls `manage-users` with `action: 'reset_password'` and `userId`. Shows a confirmation toast before sending, and success/error toast after.

### 5. Add Hebrew translations
**File: `src/constants/adminTranslations.ts`**

Add to the `users` section:
- `editUser: "עריכת משתמש"`
- `editUserDesc: "עדכון פרטי המשתמש"`
- `resetPassword: "שלח איפוס סיסמה"`
- `resetPasswordConfirm: "האם לשלוח קישור לאיפוס סיסמה?"`
- `resetPasswordSent: "קישור לאיפוס סיסמה נשלח בהצלחה"`
- `resetPasswordFailed: "שליחת איפוס סיסמה נכשלה"`
- `profileUpdated: "פרטי המשתמש עודכנו בהצלחה"`
- `profileUpdateFailed: "עדכון פרטי המשתמש נכשל"`
- `moreActions: "פעולות נוספות"`

### 6. Search improvement
Update the search query to also search by email: `query.or('name.ilike.%${search}%,email.ilike.%${search}%')`.

### Security Notes
- All mutations go through the `manage-users` edge function which verifies admin role server-side
- Password reset sends a link to the user's email — admin never sees or sets the new password
- Email updates sync both `auth.users` and `profiles` atomically
- Audit logging via `logAdminAction` for all operations


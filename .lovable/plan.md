

# Create a New Admin Account for Phase 2 Testing

## What We'll Do
Create a new admin user account with known credentials so you can log in and test the full Phase 2 functionality (task templates per phases, licensing management, etc.).

## Steps

### 1. Create the user via the `manage-users` edge function
- Call the existing `manage-users` edge function with action `create`
- Email: `test-admin@billding.ai`
- Password: `TestAdmin2024!`
- Name: `מנהל בדיקות` (Test Admin)
- Roles: `['admin']`

### 2. Verify access
- Log in at `/heyadmin/login` with the credentials above
- Navigate through the admin panel to test task template management per licensing phases

## Technical Detail
- The `manage-users` edge function already handles user creation + role assignment
- No database migrations or code changes needed
- The `AdminRoute` component will grant access once the `admin` role is set in `user_roles`

## Login Credentials (after creation)
- **URL**: `/heyadmin/login`
- **Email**: `test-admin@billding.ai`
- **Password**: `TestAdmin2024!`


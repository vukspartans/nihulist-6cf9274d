

# Critical Platform Stability & Performance Fixes

## 1. User Deletion Missing FK Cleanup (Critical — causes 500 errors)

**Problem:** `manage-users` delete action does not clean up `project_advisors` or `project_tasks` rows referencing the advisor. Deleting an advisor who has been assigned to a project will fail with FK constraint violations.

**Fix:** In `supabase/functions/manage-users/index.ts`, add cleanup steps after the rfp_invites deletion (line ~386) and before the advisor record deletion (line ~423):
- Delete `project_advisors` rows where `advisor_id = advisorId`
- Unassign `project_tasks` where `assigned_advisor_id = advisorId` (SET to NULL rather than delete, to preserve task history)
- Delete `payment_requests` where `advisor_id = advisorId` (after deleting child signatures)
- Delete `payment_milestones` linked to the advisor's project_advisors

## 2. `get-advisors-data` Unauthenticated Access (Critical — security)

**Problem:** `verify_jwt = false` in config.toml and zero auth checks in code. Anyone can call this endpoint and retrieve the full advisor matrix from private storage using the service role key.

**Fix:** Add JWT verification inside the function code:
- Extract Bearer token from Authorization header
- Verify user via `supabase.auth.getUser(token)`
- Return 401 if not authenticated
- This keeps `verify_jwt = false` (per project standard) but enforces auth in code

## 3. Outdated Import Versions in Edge Functions (Moderate — runtime stability)

**Problem:** `get-advisors-data` and `update-advisors-data` use `std@0.168.0` and `supabase-js@2.50.0` instead of project standards (`std@0.190.0`, `supabase-js@2.55.0`).

**Fix:** Update imports in both files to match standards.

## 4. `ProtectedRoute` Flash of Content (Moderate — UX)

**Problem:** When `loading` is false but `user` is null, children render for 1 second before redirect. This exposes authenticated UI (including `ToSAcceptanceModal`) to unauthenticated visitors and may trigger unnecessary API calls.

**Fix:** During the 1-second wait period, show the loading spinner instead of rendering children. Change the component to only render children when `user` is confirmed present:

```tsx
if (loading || (!user && !shouldRedirect)) {
  return <LoadingSpinner />;
}
if (!user && shouldRedirect) {
  return <Navigate to="/auth" replace />;
}
return <>{children}</>;
```

## 5. `useAuth` Context Default Never Null (Low — developer safety)

**Problem:** `AuthContext` has a default object value, so `if (!context)` in `useAuth` never throws. Using `useAuth` outside `AuthProvider` silently returns empty/false values.

**Fix:** Set default context to `null` and check for null:
```tsx
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
```

## Deployment

After all code changes, deploy the 2 updated edge functions (`get-advisors-data`, `update-advisors-data`, `manage-users`).


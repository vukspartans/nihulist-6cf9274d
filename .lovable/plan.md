

# Platform Sanity Check — Results

After auditing the codebase across auth, routing, edge functions, hooks, error handling, and general structure, the platform is in solid shape following the recent fixes. Here are the remaining findings:

## Findings

### 1. Verbose Console Logs in Production Components (Moderate — Code Hygiene)

`AdminRoute.tsx` and `RoleBasedRoute.tsx` have unconditional `console.log` statements that fire on every render. These leak internal state (user IDs, roles) into the browser console in production.

**Fix:** Wrap in `import.meta.env.DEV` guards or remove entirely. These are route guards — they render frequently.

**Files:** `AdminRoute.tsx` (lines 13, 24, 29, 34), `RoleBasedRoute.tsx` (line 20)

### 2. `passwordRecoveryPending` Not Cleared in Non-Admin Auth Flow (Low — Stale State)

`AuthEventRouter` in `App.tsx` sets `localStorage.setItem('passwordRecoveryPending', 'true')` for non-admin recovery. `AdminLogin.tsx` clears it, but `Auth.tsx` never references or clears this flag. If a non-admin user goes through password recovery, the flag persists forever.

**Fix:** Add `localStorage.removeItem('passwordRecoveryPending')` in `Auth.tsx` after successful password reset (near where `isPasswordReset` is handled).

### 3. Unused `UserRole` Interface in `useAuth.tsx` (Low — Dead Code)

The `UserRole` interface (lines 21-27) is defined but never used anywhere. It should be removed for cleanliness.

**Fix:** Delete the interface.

### 4. `process.env.NODE_ENV` Usage in Vite Project (Low — Correctness)

`ErrorBoundary.tsx` and `errorHandling.ts` use `process.env.NODE_ENV` which works in Vite but is not the canonical approach. The Vite-standard way is `import.meta.env.DEV` / `import.meta.env.PROD`.

**Fix:** Replace with `import.meta.env.DEV` / `import.meta.env.PROD`.

### 5. Blank Line / Import Formatting in `App.tsx` (Low — Style)

Line 43-44 has a double blank line between import groups. Minor formatting inconsistency.

**Fix:** Remove extra blank line.

### 6. `RFPTemplatesManagement` Has No Route (Low — Dead Page)

The page file exists at `src/pages/admin/RFPTemplatesManagement.tsx` but has no route in `App.tsx`. It's unreachable. Either it was replaced by the fee templates hierarchy pages, or the route was accidentally removed.

**Fix:** Either add a route (`/heyadmin/rfp-templates`) or delete the file if it's superseded.

---

## Already Verified as Correct

- `AuthContext` defaults to `null` with proper throw — correct
- `ProtectedRoute` shows spinner during grace period — correct
- `get-advisors-data` has JWT verification — correct
- `manage-users` has FK cleanup for advisor deletion — correct
- CORS headers consistent across all edge functions — correct
- `useAuth` defers Supabase calls via `setTimeout(0)` to avoid deadlock — correct
- Token refresh skips full reload — correct
- Same-user detection prevents unnecessary unmount — correct
- Error boundary with Hebrew fallback UI — correct
- Role hierarchy and navigation centralized — correct
- Supabase client config with `persistSession` and `autoRefreshToken` — correct

## Plan

| # | Fix | Files |
|---|-----|-------|
| 1 | Guard production console.logs behind `import.meta.env.DEV` | `AdminRoute.tsx`, `RoleBasedRoute.tsx` |
| 2 | Clear `passwordRecoveryPending` after password reset in `Auth.tsx` | `Auth.tsx` |
| 3 | Remove unused `UserRole` interface | `useAuth.tsx` |
| 4 | Replace `process.env.NODE_ENV` with `import.meta.env` | `ErrorBoundary.tsx`, `errorHandling.ts` |
| 5 | Remove extra blank line in imports | `App.tsx` |
| 6 | Remove unreachable `RFPTemplatesManagement.tsx` or add route | `App.tsx` or delete file |

All are low-impact, zero-risk cleanups. No database or edge function changes needed.


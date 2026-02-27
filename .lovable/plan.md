
# Fix: Tab Switch Resets Entrepreneur Wizard State

## Root Cause
When switching tabs/minimizing, Supabase sometimes fires auth events that bypass the "same user skip" guard (e.g. `INITIAL_SESSION` or edge-case `SIGNED_IN` where `currentUserIdRef` is null). This sets `profileLoading=true` + `rolesLoading=true` → `loading=true` → `ProtectedRoute` unmounts the entire page tree → `RFPWizard.currentStep` resets to `1`.

## Fix (single file: `src/hooks/useAuth.tsx`)

### Change 1: Skip reload for ALL non-signout events when user is already loaded
In the `onAuthStateChange` handler (lines 161-219), add an early return for **any** event where:
- The session user ID matches the current ref
- Profile and roles are already loaded (not in a loading state)

This covers `INITIAL_SESSION`, edge-case `SIGNED_IN`, and any other events that shouldn't trigger a full reload.

```ts
// After TOKEN_REFRESHED check (line 173), add:
// Skip full reload if same user is already fully loaded
if (session?.user?.id === currentUserIdRef.current && 
    currentUserIdRef.current !== null &&
    !profileLoading && !rolesLoading) {
  console.log('[useAuth] Same user already loaded, skipping reload for event:', event);
  setSession(session);
  setUser(session?.user ?? null);
  return;
}
```

This replaces the narrower `SIGNED_IN`-only check at lines 177-184 with a broader guard that covers all event types.

### Change 2: Set `currentUserIdRef` during initial session load
At line 226 (inside `getSession().then()`), set the ref immediately so it's available for any subsequent auth events:

```ts
currentUserIdRef.current = session?.user?.id ?? null;
```

This prevents the race where a tab-return event arrives before the ref is populated from the initial load.

## Why This Fixes the Bug
- No more unnecessary `loading=true` flashes on tab return
- `ProtectedRoute` won't unmount children
- `RFPWizard`, `RequestEditorDialog`, `ProposalApprovalDialog` etc. all preserve their local state

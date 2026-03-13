

# Fix: State Loss on Tab Switch / Window Minimize

## Root Cause

The bug is in `src/hooks/useAuth.tsx`, lines 161-163. The `onAuthStateChange` callback is defined inside a `useEffect([], [])` (empty deps), so `profileLoading` and `rolesLoading` are **stale closure values** — they're captured as `true` (their initial state) and never update.

When the user switches tabs and returns, Supabase fires a `SIGNED_IN` event. The guard intended to skip reloading for the same user:

```ts
if (session?.user?.id === currentUserIdRef.current && 
    currentUserIdRef.current !== null &&
    !profileLoading && !rolesLoading) {  // ← ALWAYS true in the closure (initial values)
```

Since `profileLoading` and `rolesLoading` are captured as `true` from initial render, `!profileLoading` is `false`, so the guard **always fails**. This causes:

1. `setProfileLoading(true)` + `setRolesLoading(true)` → `loading = true`
2. `ProtectedRoute` and `RoleBasedRoute` render the loading spinner
3. The entire component tree unmounts, destroying all local state
4. When loading finishes, components re-mount from scratch → user lands on the initial screen

## Fix — 1 file

### `src/hooks/useAuth.tsx`

Replace the stale closure check with **refs** that always reflect the current loading state:

1. Add two refs alongside `currentUserIdRef`:
   ```ts
   const profileLoadingRef = React.useRef(true);
   const rolesLoadingRef = React.useRef(true);
   ```

2. Keep refs in sync — update them wherever `setProfileLoading` / `setRolesLoading` are called (6 locations each), e.g.:
   ```ts
   setProfileLoading(true);
   profileLoadingRef.current = true;
   ```

3. Update the guard at line 161-163 to use the refs:
   ```ts
   if (session?.user?.id === currentUserIdRef.current && 
       currentUserIdRef.current !== null &&
       !profileLoadingRef.current && !rolesLoadingRef.current) {
   ```

This ensures the "same user already loaded" check works correctly regardless of when the closure was created, preventing unnecessary loading state resets and component tree unmounts on tab switch.

## Files Modified: 1
- `src/hooks/useAuth.tsx`


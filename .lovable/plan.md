

# Fix: Infinite Loop in Profile Setup / Organization Onboarding

## Root Cause

After completing onboarding, `createOrganization` calls the `create_organization_for_user` RPC which:
1. Creates a company record
2. Updates `profiles.organization_id` to link the user to the new company

However, `useAuth` never re-fetches the profile after this happens. So when the user navigates to `/profile` (line 273 of OrganizationOnboarding), `useOrganization` re-initializes with the **stale** `profile` from `useAuth` which still has `organization_id = null`. This means:

- `fetchOrganization` sees no `organization_id` → sets `organization = null`
- If the user then navigates to Dashboard, `needsOnboarding()` returns `true` (no organization)
- Dashboard redirects back to `/organization/onboarding`
- The onboarding page's redirect guard (line 84) checks `organization?.onboarding_completed_at` — but `organization` is null due to stale profile

The `sessionStorage.setItem('onboarding_just_completed', 'true')` partially mitigates this, but only for `needsOnboarding()` — not for the onboarding page's own redirect logic.

## Fix — 2 files

### 1. `src/hooks/useOrganization.ts`

After `createOrganization` succeeds, the organization is set in local state but `fetchOrganization` will override it on next run because the stale profile still has no `organization_id`. 

**Change**: Make `fetchOrganization` also check `organization` state (if already set) as a fallback when `profile.organization_id` is null. Additionally, after creating an org, store the org ID so subsequent fetches use it.

Add a `manualOrgId` ref that gets set on successful creation. In `fetchOrganization`, use `manualOrgId.current ?? profile.organization_id`.

### 2. `src/pages/OrganizationOnboarding.tsx`

The redirect guard at line 74-88 runs on every render, including right after completion when `organization` is being updated asynchronously. The `sessionStorage` flag set in `handleComplete` is checked by `needsOnboarding()` in Dashboard but **not** by the onboarding page's own redirect guard.

**Change**: Add a local `isCompleted` state flag that gets set in `handleComplete`/`handleSkip` before navigation. The redirect guard should also check this flag and the `sessionStorage` flag to prevent re-entering the form.

### Detailed Changes

**`src/hooks/useOrganization.ts`**:
- Add `useRef` for `createdOrgId` to persist the org ID after RPC creation
- In `fetchOrganization`: use `createdOrgId.current || (profile as any).organization_id` so re-fetches after creation still find the org
- In `createOrganization`: set `createdOrgId.current = orgData.id` after successful RPC

**`src/pages/OrganizationOnboarding.tsx`**:
- Add a local `completed` ref/state set to `true` in `handleComplete` and `handleSkip` before navigation
- In the redirect `useEffect` (line 74-88): also check `sessionStorage.getItem('onboarding_just_completed')` and the local flag to skip redirecting back to onboarding

## Files Modified: 2
- `src/hooks/useOrganization.ts`
- `src/pages/OrganizationOnboarding.tsx`




# PostHog Analytics Integration

## Overview

Integrate PostHog product analytics with a clean, centralized tracking layer. The PostHog API key is a publishable client-side key, so it can be stored directly in the codebase (no secrets needed).

## Files to Create/Edit

### 1. Install `posthog-js` package

Add `posthog-js` dependency.

### 2. Create `src/lib/posthog.ts` — Core analytics module

- Initialize PostHog with the API key and host
- `capture_pageview: true`, `autocapture: true`
- `session_recording: { maskAllInputs: true }`
- Export helper functions:
  - `initPostHog()` — called once at app startup
  - `identifyUser(userId, properties)` — called on login
  - `trackEvent(eventName, properties)` — safe wrapper with try/catch
  - `resetPostHog()` — called on logout
- All tracking calls wrapped in try/catch so failures never break the app

### 3. Edit `src/main.tsx` — Initialize PostHog

Call `initPostHog()` before `createRoot()`.

### 4. Edit `src/hooks/useAuth.tsx` — Identify user and track login

- On successful auth (when profile + roles are loaded): call `identifyUser(user.id, { email, role, name })`
- On `signOut`: call `resetPostHog()`
- Track `user_logged_in` event on SIGNED_IN auth event

### 5. Edit `src/pages/ProjectWizard.tsx` — Track `project_created`

After successful project insert (~line 208), add:
```ts
trackEvent('project_created', { project_id: project.id, project_type: formData.projectType })
```

### 6. Edit `src/pages/SubmitProposal.tsx` — Track `proposal_submitted`

After successful proposal submission, add `trackEvent('proposal_submitted', { rfp_id, proposal_id })`.

### 7. Edit `src/components/tasks/CreateTaskDialog.tsx` — Track `task_created`

After successful task creation, add `trackEvent('task_created', { project_id, task_id })`.

### 8. Edit `src/components/FileUpload.tsx` — Track `file_uploaded`

After successful file upload, add `trackEvent('file_uploaded', { project_id })`.

### 9. Track `ai_analysis_started`

In the component that triggers AI analysis (likely in `ProposalDetailDialog.tsx` or wherever `analyze-proposal` edge function is called), add the tracking event.

### 10. Create `docs/ANALYTICS.md` — Documentation

Short README section covering:
- How PostHog is initialized
- How to add new events (import `trackEvent`, call with event name + properties)
- Naming conventions: `snake_case`, noun_verb pattern
- Privacy: inputs masked, no passwords/payment data sent

## Privacy & Safety

- `maskAllInputs: true` in session recording config
- All `trackEvent` calls wrapped in try/catch
- No passwords, payment details, or sensitive PII sent as event properties
- PostHog autocapture respects `data-ph-no-capture` attributes if needed later

## Key Decisions

- PostHog API key stored as a constant in `src/lib/posthog.ts` (it's a publishable key)
- No backend/server-side PostHog needed at this stage — all tracking is client-side
- Events include `user_id` and relevant object IDs but no sensitive data


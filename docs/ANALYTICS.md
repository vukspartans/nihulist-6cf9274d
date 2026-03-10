# Analytics (PostHog)

## Overview

We use [PostHog](https://posthog.com) for product analytics, session recording, and event tracking.

## How It Works

- **Initialization**: `initPostHog()` is called in `src/main.tsx` at app startup.
- **User Identification**: `identifyUser()` is called in `useAuth.tsx` when a user logs in, sending `email`, `role`, and `name`.
- **Auto-tracking**: Page views and UI interactions are captured automatically via PostHog's `autocapture`.
- **Session Recording**: Enabled with `maskAllInputs: true` for privacy.

## Adding New Events

1. Import `trackEvent` from `@/lib/posthog`
2. Call it after the action succeeds:

```ts
import { trackEvent } from '@/lib/posthog';

trackEvent('event_name', {
  object_id: '...',
  // other relevant properties
});
```

## Naming Conventions

- Use `snake_case` for event names
- Pattern: `noun_verb` (e.g., `project_created`, `proposal_submitted`)
- Include relevant object IDs but **never** send passwords, payment details, or sensitive PII

## Currently Tracked Events

| Event | Location | Properties |
|---|---|---|
| `user_logged_in` | `useAuth.tsx` | `user_id`, `role` |
| `project_created` | `ProjectWizard.tsx` | `project_id`, `project_type` |
| `proposal_submitted` | `useProposalSubmit.ts` | `proposal_id`, `rfp_id`, `project_id` |
| `task_created` | `CreateTaskDialog.tsx` | (via callback) |
| `file_uploaded` | `FileUpload.tsx` | `file_count` |
| `ai_analysis_started` | `ProposalDetailDialog.tsx` | `proposal_id`, `project_id` |

## Privacy

- All form inputs are masked in session recordings
- No passwords or payment data are sent as event properties
- Use `data-ph-no-capture` attribute on elements to exclude from autocapture

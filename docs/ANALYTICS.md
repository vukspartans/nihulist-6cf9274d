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

### Auth & Onboarding

| Event | Location | Properties |
|---|---|---|
| `developer_signed_up` | `Auth.tsx` | `role`, `email` |
| `advisor_signed_up` | `Auth.tsx` | `role`, `email` |
| `user_logged_in` | `useAuth.tsx` | `user_id`, `role` |
| `developer_profile_completed` | `OrganizationOnboarding.tsx` | `organization_name` |
| `advisor_profile_completed` | `AdvisorProfile.tsx` | `advisor_id`, `company_name` |

### Projects & RFPs

| Event | Location | Properties |
|---|---|---|
| `project_created` | `ProjectWizard.tsx` | `project_id`, `project_type` |
| `first_project_created` | `ProjectWizard.tsx` | `project_id`, `project_type` |
| `rfp_created` | `useRFP.tsx` | `rfp_id`, `invites_sent`, `project_id` |
| `rfp_sent_to_advisors` | `useRFP.tsx` | `rfp_id`, `advisor_count`, `project_id` |
| `rfp_received` | `AdvisorDashboard.tsx` | `invite_count`, `advisor_id` |
| `rfp_opened` | `RFPDetails.tsx` | `rfp_id`, `invite_id` |

### Proposals & Selection

| Event | Location | Properties |
|---|---|---|
| `proposal_started` | `SubmitProposal.tsx` | `rfp_id`, `invite_id` |
| `proposal_submitted` | `useProposalSubmit.ts` | `proposal_id`, `rfp_id`, `project_id` |
| `proposals_comparison_opened` | `ProposalComparisonDialog.tsx` | `project_id`, `proposal_count`, `advisor_type` |
| `advisor_selected` | `useProposalApproval.ts` | `proposal_id`, `project_id`, `advisor_id` |
| `advisor_selected_for_project` | `useProposalApproval.ts` | `proposal_id`, `project_id`, `advisor_id` |
| `agreement_signed` | `useProposalApproval.ts` | `proposal_id`, `project_id` |

### Negotiations

| Event | Location | Properties |
|---|---|---|
| `negotiation_created` | `useNegotiation.ts` | `session_id`, `proposal_id`, `project_id` |
| `negotiation_started` | `NegotiationDialog.tsx` | `proposal_id`, `project_id` |
| `negotiation_submitted` | `useNegotiation.ts` | `session_id` |

### Other

| Event | Location | Properties |
|---|---|---|
| `task_created` | `CreateTaskDialog.tsx` | (via callback) |
| `file_uploaded` | `FileUpload.tsx` | `file_count` |
| `ai_analysis_started` | `ProposalDetailDialog.tsx` | `proposal_id`, `project_id` |

## Privacy

- All form inputs are masked in session recordings
- No passwords or payment data are sent as event properties
- Use `data-ph-no-capture` attribute on elements to exclude from autocapture

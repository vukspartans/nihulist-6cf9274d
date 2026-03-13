

# Enhanced PostHog Event Tracking

## Overview
Add 19 new PostHog events across the application. Currently only 6 events are tracked. The new events will be added by inserting `trackEvent()` calls at the exact success points in existing code.

## Event → File Mapping

| Event | File | Insert Point |
|---|---|---|
| `developer_signed_up` | `src/pages/Auth.tsx` | After successful `signUp()` call (~line 298), when `formData.role === 'entrepreneur'` |
| `advisor_signed_up` | `src/pages/Auth.tsx` | Same location, when `formData.role === 'advisor'` |
| `developer_profile_completed` | `src/pages/OrganizationOnboarding.tsx` | After successful `updateOrganization()` with `onboarding_completed_at` (~line 247) |
| `advisor_profile_completed` | `src/pages/AdvisorProfile.tsx` | After successful profile save/update |
| `first_project_created` | `src/pages/ProjectWizard.tsx` | Enhance existing `project_created` — add `is_first_project` property by checking project count |
| `rfp_created` | `src/hooks/useRFP.tsx` | After successful `send_rfp_invitations_to_advisors` RPC (~line 92), before emails |
| `rfp_sent_to_advisors` | `src/hooks/useRFP.tsx` | After email sending succeeds (~line 114) |
| `proposals_received` | Already tracked server-side via `proposal_submitted`; add client-side on `src/pages/ProjectDetail.tsx` when proposals list loads with count > 0 |
| `proposals_comparison_opened` | `src/components/ProposalComparisonDialog.tsx` | In useEffect when `open` becomes true |
| `advisor_selected` | `src/hooks/useProposalApproval.ts` | After successful `approve_proposal_atomic` RPC (~line 82) |
| `negotiation_created` | `src/hooks/useNegotiation.ts` | After successful `createNegotiationSession` (~line 36) |
| `agreement_signed` | `src/hooks/useProposalApproval.ts` | Same as `advisor_selected` — the approval includes signature |
| `negotiation_started` | `src/components/negotiation/NegotiationDialog.tsx` | After successful `createNegotiationSession` call (~line 405) |
| `negotiation_submitted` | `src/hooks/useNegotiation.ts` | After successful `respondToNegotiation` (~line 94) |
| `advisor_selected_for_project` | `src/hooks/useProposalApproval.ts` | Same as `advisor_selected`, with `project_id` property |
| `rfp_received` | `src/pages/AdvisorDashboard.tsx` | When invites list loads — track once per session using a ref |
| `rfp_opened` | `src/pages/RFPDetails.tsx` | After `markAsOpened()` succeeds (~line 238) |
| `proposal_started` | `src/pages/SubmitProposal.tsx` | When advisor first opens the proposal form (on mount) |
| `proposal_submitted` | Already tracked in `useProposalSubmit.ts` |

## Implementation Details

**Files to modify: 10**

1. **`src/pages/Auth.tsx`** — Add `trackEvent` import; after line 298 (`setEmailSent(true)`), add:
   ```ts
   trackEvent(formData.role === 'advisor' ? 'advisor_signed_up' : 'developer_signed_up', {
     role: formData.role, email: formData.email
   });
   ```

2. **`src/pages/OrganizationOnboarding.tsx`** — After successful `updateOrganization` (~line 247), add `trackEvent('developer_profile_completed', { organization_id })`.

3. **`src/pages/AdvisorProfile.tsx`** — After successful profile save, add `trackEvent('advisor_profile_completed', { advisor_id })`.

4. **`src/pages/ProjectWizard.tsx`** — Enhance existing `project_created` event: query project count before insert, then fire `first_project_created` if count was 0.

5. **`src/hooks/useRFP.tsx`** — After RPC success (~line 92): `trackEvent('rfp_created', { rfp_id, invites_sent })`. After email success (~line 114): `trackEvent('rfp_sent_to_advisors', { rfp_id, advisor_count })`.

6. **`src/components/ProposalComparisonDialog.tsx`** — Add useEffect on `open`: `trackEvent('proposals_comparison_opened', { project_id, proposal_count })`.

7. **`src/hooks/useProposalApproval.ts`** — After approval success (~line 82):
   ```ts
   trackEvent('advisor_selected', { proposal_id, project_id });
   trackEvent('advisor_selected_for_project', { proposal_id, project_id });
   trackEvent('agreement_signed', { proposal_id, project_id });
   ```

8. **`src/hooks/useNegotiation.ts`** — After `createNegotiationSession` success: `trackEvent('negotiation_created', { session_id, proposal_id })`. After `respondToNegotiation` success: `trackEvent('negotiation_submitted', { session_id })`.

9. **`src/pages/RFPDetails.tsx`** — After `markAsOpened`: `trackEvent('rfp_opened', { rfp_id, invite_id })`.

10. **`src/pages/SubmitProposal.tsx`** — On mount/load: `trackEvent('proposal_started', { rfp_id, invite_id })`.

## Not Changed
- `docs/ANALYTICS.md` — will be updated with the new events table.
- No refactoring of existing events.
- All existing styling and logic preserved.


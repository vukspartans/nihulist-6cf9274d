

# Plan: Regression Tests for 5 Recent Bugs

## Overview

Create a Vitest + React Testing Library test suite covering 5 bug regressions. The project already has Vitest configured in `vite.config.ts` with jsdom environment and `./src/test/setup.ts` as setup file. We need to create the setup file (missing), add `@testing-library/react` and `@testing-library/jest-dom` as dependencies, and write the tests.

Testing dependencies `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` are missing from `package.json` and need to be added.

## Files to Create/Modify

### 1. `src/test/setup.ts` — Test setup file (referenced by vite config but doesn't exist)
Standard jsdom setup with `@testing-library/jest-dom` matchers and `matchMedia` mock.

### 2. `tsconfig.app.json` — Add `"vitest/globals"` to types
Required for global `describe`/`it`/`expect` without imports.

### 3. `package.json` — Add testing devDependencies
- `@testing-library/jest-dom@^6.6.0`
- `@testing-library/react@^16.0.0`  
- `jsdom@^20.0.3`

### 4. `src/test/regression-bugs.test.tsx` — Main test file

**5 test blocks:**

#### Bug 58: Consultant sees entrepreneur's signature on approved proposals
- Render `AdvisorProposalViewDialog` (or verify the signature section logic) with mock proposal data where `status: 'accepted'` and `signature_blob` is set.
- Since `AdvisorProposalViewDialog` fetches data via Supabase (hard to mock in unit tests), we'll test the rendering logic by extracting the signature visibility condition: assert that when `proposal.signature_blob` exists, the signature `<img>` with `alt="חתימה"` renders.
- Approach: Render a minimal component that mirrors the signature rendering logic from `AdvisorProposalViewDialog` lines 644-670, and assert the image appears.

#### Bug 59: Price updates correctly in Round 3
- Test the `send-negotiation-response` edge function's price calculation logic.
- Create a Deno edge function test that verifies `result.new_price` is used as `newTotal` (not the manual sum from `updated_line_items`).
- Alternatively, write a frontend unit test that mocks the negotiation session data with 3 rounds and asserts the displayed price matches the latest round.

#### Bug 60: "Counter Offer" / "המשך משא ומתן" button visible after negotiation round
- Render `EntrepreneurNegotiationView` footer logic: when `!isAwaitingResponse` and `onContinueNegotiation` is provided, the "המשך משא ומתן" button should render.
- Mock the session data as `status: 'responded'`.

#### Bug 61: Proposal approved email has correct payload
- Deno edge function test for `notify-proposal-approved`: invoke the function with test payload and verify it processes correctly (or unit test the template rendering with `advisorType` prop and without `timelineDays`).
- Frontend alternative: test that `ProposalApprovedEmail` template renders `תחום` field and does NOT render `לוח זמנים`.

#### Bug 63: Consultant profile doesn't crash
- Render `AdvisorProfile` page wrapped in necessary providers (router, auth mock) with standard mock data.
- Assert no error boundary is triggered and the page renders key elements.

## Technical Approach

Since most components rely heavily on Supabase queries and auth context, pure unit rendering will require mocking `@/integrations/supabase/client` and `@/hooks/useAuth`. I'll create a shared mock setup and focused tests that verify the **specific rendering conditions** each bug addresses, rather than full integration tests.

For the email template tests (Bug 61), I'll write a **Deno test** at `supabase/functions/notify-proposal-approved/index_test.ts` that validates the template rendering.

## Files Summary
| File | Action |
|------|--------|
| `src/test/setup.ts` | Create |
| `tsconfig.app.json` | Modify (add vitest/globals) |
| `package.json` | Modify (add test deps) |
| `src/test/regression-bugs.test.tsx` | Create (Bugs 58, 59, 60, 63) |
| `supabase/functions/notify-proposal-approved/template_test.ts` | Create (Bug 61) |


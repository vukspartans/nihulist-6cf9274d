

# Fix: Entrepreneur Sees Stale Proposal Prices After Negotiation

## Root Causes Found

### Bug 1: Stale `selectedProposal` state (PRIMARY CAUSE)
In `ProjectDetail.tsx`, when the entrepreneur opens a proposal, `selectedProposal` is set as a snapshot of the proposal object. Even when `fetchProposals()` runs (via `onStatusChange`), the `proposals` array updates but `selectedProposal` remains the old object. The dialog shows stale prices.

### Bug 2: No realtime refetch of proposals
`ProjectDetail.tsx` only fetches proposals on mount (`useEffect` with `[id]`). If the consultant responds while the entrepreneur has the page open, the entrepreneur sees old data until a manual refresh.

### Bug 3: Version column mismatch
`ProposalDetailDialog` fetches `line_items` from `proposal_versions` (line 143), but the DB function `submit_negotiation_response` writes negotiated line items to the `fee_line_items` column. Historical version views show empty line items.

## Changes

### 1. `src/pages/ProjectDetail.tsx` — Fix stale selectedProposal + add realtime

- **Derive selectedProposal from proposals array** instead of holding a separate stale copy. Use `selectedProposalId` state and compute the proposal object from the latest `proposals` array.
- **Add Supabase realtime subscription** on the `proposals` table filtered by `project_id` to auto-refetch when the consultant submits a negotiation response.
- When `onStatusChange` triggers `fetchProposals()`, the derived `selectedProposal` automatically gets the latest data.

### 2. `src/components/ProposalDetailDialog.tsx` — Fix version column mismatch

- Line 143: Change `.select('price, scope_text, line_items')` to `.select('price, scope_text, line_items, fee_line_items')`.
- In the version parsing logic (~lines 150-161), prefer `fee_line_items` over `line_items` when both exist (the DB function writes to `fee_line_items`).

### 3. `src/components/ProposalDetailDialog.tsx` — Re-fetch proposal data on dialog open

- When the dialog opens, fetch the latest proposal data directly from `proposals` table to ensure the dialog always shows current values, not a potentially stale snapshot passed as props.

## No database changes needed
The `submit_negotiation_response` function already correctly updates both `proposals.fee_line_items` and `proposals.price`. The issue is purely frontend data freshness.


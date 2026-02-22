
# Fix: "Cannot access 'filteredProposals' before initialization"

## Root Cause
Line 518-524 in `AdvisorDashboard.tsx` contains debug logging code that references `filteredProposals` -- a variable computed via `useMemo` or derived state **outside** the `fetchAdvisorData` function. In JavaScript, `const` variables declared with `useMemo` cannot be accessed before their declaration runs, causing a `ReferenceError` that crashes the entire data loading.

## Fix
Remove the debug logging block at lines 518-524. This code was added for debugging purposes but references a variable (`filteredProposals`) that isn't available inside `fetchAdvisorData`. It serves no functional purpose and is the direct cause of the "Failed to load advisor data" error.

### File: `src/pages/AdvisorDashboard.tsx`

**Delete lines 518-524:**
```typescript
// DELETE THIS BLOCK:
          // Log warnings for proposals that exist but might not render
          (proposalData || []).forEach(p => {
            const rendered = filteredProposals?.some?.((fp: any) => fp.id === p.id);
            if (!rendered) {
              console.warn('[AdvisorDashboard] ⚠️ Proposal exists but may not be rendered for Consultant:', p.id, p.status);
            }
          });
```

## Impact
- Fixes the "Failed to load advisor data" error completely
- No functional behavior changes -- this was only debug logging
- The advisor dashboard will load normally again

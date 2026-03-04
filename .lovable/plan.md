

# Audit: PDF Export Consistency Across All Endpoints

## Findings

There are **4 PDF export endpoints** in the codebase. After the recent fixes, here is the status:

| Endpoint | File | Logo | Services | Units (Hebrew) | Issues |
|----------|------|------|----------|-----------------|--------|
| **Entrepreneur viewing proposal** | `ProposalDetailDialog.tsx` | Fixed | Fixed | Fixed | None |
| **Advisor viewing own proposal** | `AdvisorProposalViewDialog.tsx` | Not passed | Fixed | Fixed | Missing `companyLogoUrl` |
| **Pre-submit confirmation** | `ConfirmProposalDialog.tsx` | Not passed | N/A (not shown) | **RAW English** | Units still raw (`item.unit` not through `getFeeUnitLabel`) |
| **Comparison table** | `ProposalComparisonDialog.tsx` → `exportProposals.ts` | N/A (summary table) | N/A | N/A | Different format — this is a comparison summary, not a single proposal. No unit/service issues. |

## Remaining Issues to Fix

### 1. `ConfirmProposalDialog.tsx` — Units in English (line 106)

Currently passes `unit: item.unit || 'פאושלי'` — this sends raw English codes like `"lump_sum"`, `"sqm"` to the PDF. Needs `getFeeUnitLabel()`.

**Fix**: Change line 106 from:
```
unit: item.unit || 'פאושלי',
```
to:
```
unit: getFeeUnitLabel(item.unit || '') || 'פאושלי',
```

Import `getFeeUnitLabel` from `@/constants/rfpUnits` (already imported but only `getChargeTypeLabel`, `getDurationUnitLabel`, `isRecurringChargeType` — need to add `getFeeUnitLabel`).

### 2. `AdvisorProposalViewDialog.tsx` — Missing logo

The advisor's own logo URL is not passed as `companyLogoUrl`. The proposal object has `proposal.advisors?.logo_url` available (from the joined query). Need to add `companyLogoUrl: proposal.advisors?.logo_url || undefined` to the PDF data.

### Files Changed

| File | Change |
|------|--------|
| `src/components/ConfirmProposalDialog.tsx` | Add `getFeeUnitLabel` to imports, apply to unit mapping |
| `src/components/AdvisorProposalViewDialog.tsx` | Add `companyLogoUrl` to PDF data |


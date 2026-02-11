

# UX Review Fixes -- 4 Issues

## Issue 1: Missing Percentage Summary on Admin Milestones Tab

The milestones tab inside the category page (`FeeTemplatesByCategory.tsx`, line 651-677) shows the milestones table but does NOT include the `MilestonePercentageSummary` component. The standalone milestones management page (`MilestoneTemplatesManagement.tsx`) already uses this component, so we just need to add it here too.

**Fix**: Import and render `MilestonePercentageSummary` above the milestones table in `FeeTemplatesByCategory.tsx`, passing the `milestones` array.

---

## Issue 2: Unit and Charge Type Shown in English

In `FeeTemplatesByCategory.tsx` (lines 228-230), the fee items table shows raw English values (`lump_sum`, `one_time`) instead of Hebrew labels. The helper functions `getFeeUnitLabel` and `getChargeTypeLabel` already exist in `src/constants/rfpUnits.ts` but are not imported or used here.

The old `RFPTemplatesManagement.tsx` page already uses them correctly (line 151: `getFeeUnitLabel(item.unit)`).

**Fix**: Import `getFeeUnitLabel` and `getChargeTypeLabel` from `@/constants/rfpUnits` and update the two column definitions:
- Line 228: Change `accessorKey: "unit"` to `cell: (item) => getFeeUnitLabel(item.unit)`
- Line 230: Change `item.charge_type || "-"` to `getChargeTypeLabel(item.charge_type || 'one_time')`

---

## Issue 3: "יועץ סביבתי" Missing from Entrepreneur Advisor Selection

The entrepreneur-side advisor selection (`PhasedAdvisorSelection`) builds its list from:
1. `data.required_categories` -- from the JSON file in Supabase Storage (`advisors_projects_full.json`)
2. `getRecommendedAdvisors(projectType)` -- from `advisorPhases.ts`

"יועץ סביבתי" IS present in `advisorPhases.ts` (phase 3) and in `ADVISOR_EXPERTISE` constant. However, if it's missing from the JSON file's relevant project entry, it won't appear.

**Fix**: This requires updating the `advisors_projects_full.json` file in Supabase Storage to include "יועץ סביבתי" in the relevant project type's Advisors array (e.g., under "תמ"א 38/2 – הריסה ובנייה מחדש"). This is a data update, not a code change. We can either:
- (A) Update the JSON file via the `update-advisors-data` edge function
- (B) Add a fallback in `PhasedAdvisorSelection` that merges `ADVISOR_EXPERTISE` types that have templates configured in `fee_template_categories` but are missing from the JSON

Option B is more robust long-term. However, the simplest immediate fix is to ensure the JSON data is complete.

We should also verify the JSON contents and update if needed.

---

## Issue 4: Default Submission Method Not Auto-Selecting on Entrepreneur Side

The auto-select logic in `ServiceDetailsTab.tsx` (lines 113-117) already looks for `submissionMethods.find(m => m.is_default)`. So the default method SHOULD auto-select when methods load.

However, I checked the data: the "פאושלי" method for "יועץ גז / תכנון וייעוץ גז" has `is_default: true`. The auto-select effect depends on `submissionMethods` loading AND `selectedMethodId` being null. If the category auto-select fires correctly, the methods will load, and the default method should be selected.

**Possible cause**: The `categoryInitializedRef` guard or the reset effect might be interfering. Let me trace the flow:
1. Categories load -> auto-select default category (line 106-109)
2. This triggers `handleCategoryChange` -> sets `selectedCategoryId`
3. `selectedCategoryId` change triggers method reset effect (line 121-128), but it's skipped on first run due to `categoryInitializedRef`
4. Methods load for the selected category
5. Auto-select default method effect fires (line 113-117) -> selects `is_default` method

This flow looks correct. The issue may be that the entrepreneur is selecting "יועץ גז" but the category/method dropdown isn't visible because no categories load (if the project type doesn't match). With the `projectType` fix from the previous round, this should now work. But we need to verify the project type matches exactly.

**Verification needed**: Check that the entrepreneur's project type normalizes to exactly "תמ"א 38/2 – הריסה ובנייה מחדש" which is what the categories are configured for.

---

## Technical Implementation Summary

| # | File | Change |
|---|------|--------|
| 1 | `FeeTemplatesByCategory.tsx` | Add `MilestonePercentageSummary` import and render above milestones table |
| 2 | `FeeTemplatesByCategory.tsx` | Import `getFeeUnitLabel`/`getChargeTypeLabel`, use in fee item columns |
| 3 | Data fix + optional code | Update JSON in Supabase Storage to include "יועץ סביבתי" for the relevant project type |
| 4 | Verification | Confirm default method auto-selects after projectType fix; no code change expected |


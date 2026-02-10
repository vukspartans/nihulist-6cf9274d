

# Senior Architect Review -- Recent Additions

## Overall Assessment

The implementation is **structurally sound**. The template pipeline (admin -> entrepreneur), index calculation in payments, and service grouping logic are all correctly wired. However, there are **5 issues** that should be fixed before delivery.

---

## Issue 1: Stale Closure in FeeItemsTable Auto-Load (Bug)

**File**: `src/components/rfp/FeeItemsTable.tsx` (lines 45-52)

**Problem**: The `useEffect` calls `loadTemplates()` but does NOT include it in the dependency array. The `loadTemplates` function closes over `advisorType`, `categoryId`, and `submissionMethodId` from render scope. On first render, when the effect fires, `loadTemplates` may reference stale prop values because React hasn't re-created the function reference yet.

The `useRef` guard (`lastAutoLoadRef`) partially masks this, but it's still a React best-practice violation that could cause subtle bugs.

**Fix**: Add `loadTemplates` to the dependency array, or better, inline the key check inside `loadTemplates` itself. The cleanest fix: wrap `loadTemplates` in `useCallback` with its dependencies, then include it in the effect's dependency array.

---

## Issue 2: Race Condition Between Category Reset and Method Auto-Select (Bug)

**File**: `src/components/rfp/ServiceDetailsTab.tsx` (lines 119-123 and 112-117)

**Problem**: When `selectedCategoryId` changes:
1. Line 120-123: The reset effect sets `selectedMethodId = null` and calls `onMethodChange(null, null)`
2. Line 112-117: The auto-select effect fires when `submissionMethods` loads and sets a default method

But the reset effect (line 120) triggers on EVERY `selectedCategoryId` change INCLUDING the initial auto-select from lines 104-108. This means:
- First render: auto-select category fires -> reset method fires -> methods load -> auto-select method fires

This works in practice because the reset fires before methods load, but it's fragile and causes an unnecessary `onMethodChange(null, null)` call which propagates to `RequestEditorDialog` and could briefly clear `formData.selectedMethodId`.

**Fix**: Guard the reset effect so it only fires on SUBSEQUENT category changes (not the initial one), using a ref to track if we've initialized.

---

## Issue 3: Service Templates Load Ignores Submission Method (Gap)

**File**: `src/components/rfp/ServiceDetailsTab.tsx` (lines 126-130)

**Problem**: The service scope templates load is triggered by `selectedCategoryId` alone (line 127-130), but the query at line 139 only filters by `category_id`. It does NOT filter by `submissionMethodId`. This means if the admin defines different service scopes per submission method under the same category, they'll all load together.

**Fix**: If the `default_service_scope_templates` table has a `submission_method_id` column, add it to the query filter. If not, this is a known limitation to document.

---

## Issue 4: Financial Summary Uses `amount` Instead of `index_adjusted_amount` (Bug)

**File**: `src/hooks/useProjectPayments.ts` (lines 87-94)

**Problem**: The `calculateSummary` function sums `r.total_amount || r.amount` for paid and pending requests. However, `total_amount` is already calculated using the index-adjusted amount (line 187). So the summary is correct IF `total_amount` is populated. But for older payment requests created before the migration (where `total_amount` might be null), it falls back to `r.amount` which is the un-adjusted original amount. This is acceptable backward compatibility.

**Verdict**: This is actually correct. No fix needed.

---

## Issue 5: Detail Dialog Shows Original Amount in Financial Section (Minor UX gap)

**File**: `src/components/payments/PaymentRequestDetailDialog.tsx` (lines 155-169)

**Problem**: The financial summary section at line 157 always shows `request.amount` as "סכום לפני מע״מ" (amount before VAT). When index adjustment exists, the label should clarify this is the ORIGINAL amount, and the adjusted amount should be the primary figure. Currently the index section (lines 102-150) shows both values, but the financial summary below it repeats the original amount without context.

**Fix**: When `index_adjusted_amount` exists, show the adjusted amount as the primary "amount before VAT" in the financial section, or add a note that VAT is calculated on the adjusted amount.

---

## Implementation Summary

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | Medium | `FeeItemsTable.tsx` | Wrap `loadTemplates` in `useCallback`, add to effect deps |
| 2 | Low | `ServiceDetailsTab.tsx` | Add init ref guard to category reset effect |
| 3 | Low | `ServiceDetailsTab.tsx` | Add `submissionMethodId` filter to service template query if column exists |
| 4 | N/A | `useProjectPayments.ts` | No fix needed -- already correct |
| 5 | Low | `PaymentRequestDetailDialog.tsx` | Show adjusted amount as primary in financial summary when index exists |


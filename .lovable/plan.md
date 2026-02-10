

# Full Review: Fee Templates Pipeline -- Gaps and Fixes

## Summary

The admin template management (5-level hierarchy) is well built. However, the **entrepreneur-side pipeline** has critical gaps where the selected category and submission method from the Services tab are **not propagated** to the Fee Items and Payment tabs. This means the admin's carefully organized templates are not being loaded correctly for the entrepreneur.

## Gap Analysis

### Gap 1: FeeItemsTable ignores category and submission method (CRITICAL)

**Problem**: `FeeItemsTable.tsx` line 115-119 loads templates using only `advisor_specialty`:
```
.eq('advisor_specialty', advisorType)
```
It completely ignores the `categoryId` and `submissionMethodId` that the entrepreneur selected in the Services tab. This means ALL fee item templates for that advisor type are loaded in a flat list, rather than the specific items for the chosen category + method.

**Fix**: Pass `categoryId` and `submissionMethodId` from `RequestEditorDialog` to `FeeItemsTable`, and update the `loadTemplates` query to filter by these values.

### Gap 2: Fee items not auto-loaded when category/method changes

**Problem**: When the entrepreneur selects a category and submission method in the Services tab, the service scope items are loaded automatically (`loadTemplatesForCategory`). However, the fee items in the Fees tab are NOT auto-loaded -- they remain empty until the entrepreneur manually clicks "Load Template".

**Fix**: Add an `onFeeItemsLoaded` callback or auto-load fee items when `categoryId` + `submissionMethodId` change, similar to how services are auto-loaded.

### Gap 3: Milestones tab uses categoryId correctly (OK)

The `PaymentTermsTab` already receives and uses `categoryId` to filter milestone templates (line 91). This is working correctly.

### Gap 4: Services tab checklist does not show two-level headers

**Problem**: The admin-side Services tab now supports a two-level hierarchy (headers + items grouped by `default_fee_category`). However, on the entrepreneur side in `ServiceDetailsTab.tsx`, the loaded services are displayed as a flat checklist without any grouping by header.

**Fix**: Group the `scopeItems` by `fee_category` (which maps to `default_fee_category`) and render them under collapsible header sections, mirroring the admin's structure.

## Implementation Plan

### 1. Pass category/method to FeeItemsTable

**File**: `src/components/RequestEditorDialog.tsx` (lines 1196-1202)

Add `categoryId` and `submissionMethodId` props:
```tsx
<FeeItemsTable
  items={formData.feeItems || []}
  optionalItems={formData.optionalFeeItems || []}
  onItemsChange={...}
  onOptionalItemsChange={...}
  advisorType={advisorType}
  categoryId={formData.selectedCategoryId}       // NEW
  submissionMethodId={formData.selectedMethodId}  // NEW
/>
```

### 2. Update FeeItemsTable to use category/method filters

**File**: `src/components/rfp/FeeItemsTable.tsx`

- Add `categoryId?: string` and `submissionMethodId?: string` props
- Update `loadTemplates` query (line 115-119) to filter by these:
  - If `categoryId` and `submissionMethodId` are set: `.eq('category_id', categoryId).eq('submission_method_id', submissionMethodId)`
  - Fallback to current behavior (just `advisor_specialty`) if not set
- Add a `useEffect` to auto-load fee items when `categoryId` + `submissionMethodId` change (similar to how services auto-load)

### 3. Group services by header on entrepreneur side

**File**: `src/components/rfp/ServiceDetailsTab.tsx` (lines 399-441)

Replace the flat list rendering with grouped sections:
- Group `scopeItems` by `fee_category`
- Render each group under a header label (non-collapsible, just a visual separator)
- Keep the checkbox functionality per item
- This makes the entrepreneur see the same logical grouping the admin defined

### 4. No database or migration changes needed

All the data is already correctly structured. The issue is purely in the frontend query filters and display logic.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/rfp/FeeItemsTable.tsx` | Add `categoryId` + `submissionMethodId` props, update `loadTemplates` query, add auto-load effect |
| `src/components/RequestEditorDialog.tsx` | Pass `categoryId` and `submissionMethodId` to FeeItemsTable |
| `src/components/rfp/ServiceDetailsTab.tsx` | Group checklist items by `fee_category` header |


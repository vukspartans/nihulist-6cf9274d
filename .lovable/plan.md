

# Fixes for Issues 6, 7, and 8

## Issue 6: Irrelevant Headers in Admin Service Template Dialogs

**Problem**: When creating or editing a service in the admin templates, the "כותרת (קטגוריה)" dropdown shows hardcoded values from `DEFAULT_FEE_CATEGORIES` in `rfpUnits.ts` (כללי, חוו"ד ראשונית, הכנת נספח תנועה, etc.). These are generic defaults that don't match the actual headers defined for the current category.

**Root Cause**: Both `CreateServiceScopeTemplateDialog` and `EditServiceScopeTemplateDialog` import and use `DEFAULT_FEE_CATEGORIES` as their dropdown options. The Edit dialog also merges `availableHeaders` but still includes all the irrelevant defaults.

**Fix**:
- In `CreateServiceScopeTemplateDialog`: When no `defaultHeader` is provided, show only the headers that already exist in the current category (passed as a new `availableHeaders` prop), plus an option to type a custom header name. Remove the `DEFAULT_FEE_CATEGORIES` import.
- In `EditServiceScopeTemplateDialog`: Show only `availableHeaders` (already passed as prop). Remove `DEFAULT_FEE_CATEGORIES` from the merged set.
- Both dialogs: Add an "אחר..." (Other) option that lets the admin type a custom header, so they're not locked to existing ones. If no headers exist yet, show a free-text input instead.

| File | Change |
|------|--------|
| `CreateServiceScopeTemplateDialog.tsx` | Accept `availableHeaders` prop, use it instead of `DEFAULT_FEE_CATEGORIES`, add custom input option |
| `EditServiceScopeTemplateDialog.tsx` | Use only `availableHeaders` (remove `DEFAULT_FEE_CATEGORIES`), add custom input option |
| `FeeTemplatesByCategory.tsx` | Pass `availableHeaders={headerNames}` to `CreateServiceScopeTemplateDialog` (already passed to Edit) |

---

## Issue 7: Optional Services Must Be Excluded from Total Sum

**Problem**: On the entrepreneur side, services marked as "אופציונלי" currently just show a badge but are otherwise treated the same as mandatory items -- they're included in the total and sent the same way to the advisor.

**Expected behavior** (confirmed by user): Optional services should appear with `is_included = false` (unchecked) by default, giving the entrepreneur the choice to include them.

**Fix**:
- In `ServiceDetailsTab.tsx` (lines 150-156 and 182-188): When loading templates, set `is_included: !template.is_optional` -- so optional items load unchecked.
- This ensures optional items are visible but not selected by default, matching the user's expectation that optional = separated from total.

| File | Change |
|------|--------|
| `ServiceDetailsTab.tsx` | Change `is_included: true` to `is_included: !template.is_optional` in both `loadTemplatesForCategory` and `loadDefaultTemplates` |

---

## Issue 8: Remove Fee Category Dropdown from Entrepreneur Service Items

**Problem**: Each service item on the entrepreneur side shows a "סעיף שכ״ט" dropdown that lets the entrepreneur link a service to a fee category. This dropdown is populated from fee item descriptions + "כללי", which makes no sense to the entrepreneur and adds unnecessary complexity.

**Fix**: Remove the fee_category `Select` dropdown from each service item in the entrepreneur's service checklist. The fee_category value is already set from the admin template and is used internally for grouping -- the entrepreneur doesn't need to change it.

| File | Change |
|------|--------|
| `ServiceDetailsTab.tsx` | Remove the `<Select>` for `fee_category` from `renderItem` (lines 446-461), and remove the `feeCategories` const (lines 83-88) |

---

## Summary

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| 6 | Irrelevant headers in admin dropdown | `CreateServiceScopeTemplateDialog`, `EditServiceScopeTemplateDialog`, `FeeTemplatesByCategory` | Admin UX -- show only relevant headers |
| 7 | Optional services included by default | `ServiceDetailsTab` | Entrepreneur UX -- optional items unchecked by default |
| 8 | Unnecessary fee category dropdown | `ServiceDetailsTab` | Entrepreneur UX -- remove confusing dropdown |


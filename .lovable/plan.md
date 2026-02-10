

# RLS Fix for fee_submission_methods + Production Readiness Check

## Critical Finding

The `fee_submission_methods` table has the **exact same RLS bug** that was just fixed for `fee_template_categories`. The admin policy checks `profiles.role = 'admin'` instead of using the `user_roles` table (or the `has_role()` function).

This means the admin client **cannot create submission methods** -- which is the next step after creating a category. The entire template pipeline is blocked at step 2.

### Current state of the database:
- 1 category exists ("רישוי" for אדריכל / תמ"א 38/2)
- 0 submission methods (blocked by RLS)
- 0 fee items under it
- 0 service scope items under it

## Fix Required

**Single SQL migration** to update the RLS policy on `fee_submission_methods`:

```sql
DROP POLICY IF EXISTS "Admins can manage submission methods" ON public.fee_submission_methods;

CREATE POLICY "Admins can manage submission methods"
ON public.fee_submission_methods
FOR ALL
USING (
  has_role(auth.uid(), 'admin')
);
```

This aligns it with the pattern used by `default_fee_item_templates` and `default_service_scope_templates`, which already use `has_role()` and work correctly.

## No Other Blockers

All other tables in the pipeline have correct RLS:

| Table | Admin Policy | Status |
|-------|-------------|--------|
| `fee_template_categories` | `EXISTS (user_roles...)` | Fixed (previous migration) |
| `fee_submission_methods` | `profiles.role = 'admin'` | **BROKEN -- needs fix** |
| `default_fee_item_templates` | `has_role(auth.uid(), 'admin')` | OK |
| `default_service_scope_templates` | `has_role(auth.uid(), 'admin')` | OK |

## Code Pipeline Verification (All OK)

The frontend code wiring is confirmed correct:
1. **ServiceDetailsTab** -- auto-selects category, loads services by `category_id`, resets method on category change (with init guard)
2. **FeeItemsTable** -- receives `categoryId` + `submissionMethodId`, auto-loads with `useCallback` + `useEffect`, filters query correctly
3. **RequestEditorDialog** -- passes `formData.selectedCategoryId` and `formData.selectedMethodId` to both FeeItemsTable and PaymentTermsTab
4. **PaymentTermsTab** -- receives `categoryId` for milestone filtering

## Implementation

Single file: one SQL migration to fix the RLS policy on `fee_submission_methods`.


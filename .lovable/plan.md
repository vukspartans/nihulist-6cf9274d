

# Fix: Template Types Level & Empty Page Bug

## Issues Identified

### Issue 1: Empty page when entering a project type
- The project type card shows "1 תבנית" for תמ"א 38/2 because `useProjectTypeSummary` counts templates from all 3 tables regardless of `category_id`
- But when clicking into it, `FeeTemplatesByAdvisorProject` shows Template Type cards from `fee_template_categories` — which is **empty** (0 rows in DB)
- Existing templates have `category_id = NULL` and `project_type = NULL`, so they don't belong to any category yet

### Issue 2: Template Type creation flow needs polish
- The Create/Edit dialogs exist but need verification that they work end-to-end
- The client wants: a list of Template Types (e.g., הכנת תב"ע, הכנת מצגת לדיירים, רישוי) with a "Default" button on the left side, and an index (מדד) selector per template type

---

## Plan

### Step 1: Fix Empty State UX on FeeTemplatesByAdvisorProject
Show a clear onboarding state when no categories exist yet, with:
- A descriptive message explaining the admin needs to create template types first
- A prominent "Create Template Type" button
- If there are existing "orphan" templates (with `category_id = NULL`), show a notice: "יש X תבניות שלא שויכו לסוג תבנית" with an option to assign them later

### Step 2: Fix Template Count on Project Cards
Update `useProjectTypeSummary` to also count templates with `project_type = NULL` (global templates). Currently, templates with `project_type = NULL` for אדריכל are being counted but misleadingly shown under specific project types.

Alternatively, show a separate "כללי (ללא סוג פרויקט)" card for templates without a project type.

### Step 3: Polish the Template Type Card Layout per Client Reference
Based on the client's reference image, each template type card should display:
- Template type name (e.g., הכנת תב"ע) as the card title
- "ברירת מחדל" (Default) button aligned to the LEFT side of the card
- Index type (מדד) badge displayed on the card
- Edit and Delete action buttons
- The card should be clickable to drill into the 3-tab template management

### Step 4: Ensure Create Category Dialog Works End-to-End
Verify `CreateFeeCategoryDialog` properly passes:
- `advisor_specialty` from URL params
- `project_type` from URL params
- `name` from user input
- `default_index_type` from dropdown selection
- `is_default` from toggle

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/FeeTemplatesByAdvisorProject.tsx` | Improve empty state UX, add orphan template notice, polish card layout per client reference |
| `src/hooks/useFeeTemplateHierarchy.ts` | Fix `useProjectTypeSummary` to handle NULL project_type templates correctly — either exclude them from specific project counts or show them separately |

### Database State
- `fee_template_categories`: 0 rows (empty) — needs admin to create entries
- `default_fee_item_templates`: 6 rows for אדריכל with `category_id = NULL`, `project_type = NULL`
- These orphan templates need a migration path: either auto-assign to a default category or let admin manually assign them

### No Schema Changes Needed
All required columns (`category_id`, `default_index_type`, `is_default`) already exist in the `fee_template_categories` table.




# Client Feedback: Admin Template Management (ניהול תבניות) - Gap Analysis & Implementation Plan

## Document Summary

The client (Narsha) reviewed the admin template management system and provided detailed feedback organized by hierarchy level. Here's what's done vs. what's missing:

---

## Current System Structure (What EXISTS)

```text
Advisor Type (e.g., אדריכל)
  --> Project Type (e.g., תמ"א 38/2)
      --> 3 Tabs: שירותים | שורות שכ"ט | תשלום
          (Flat list of items in each tab)
```

## Client's EXPECTED Structure (What They WANT)

```text
Advisor Type (e.g., אדריכל)
  --> Project Type (e.g., תמ"א 38/2)
      --> Template Types (e.g., הכנת תב"ע, הכנת מצגת לדיירים, רישוי...)  <-- MISSING LEVEL
          --> Submission Method (e.g., פאושלי, כמותי, שעתי)               <-- MISSING LEVEL
              --> Fee Item Rows (שורות שכ"ט)                               <-- EXISTS but nested wrong
              --> Payment Milestones (תשלום)                               <-- EXISTS but nested wrong
```

---

## Gap Analysis: Item-by-Item from Client Document

### Section 1: Admin Side

| # | Requirement | Status | Details |
|---|------------|--------|---------|
| 1.1 | Main page grouped by advisor type | DONE | `FeeTemplatesHierarchy.tsx` shows advisor cards |
| 1.1.1 | Click advisor -> list of all project types | DONE | `FeeTemplatesByProject.tsx` shows project cards |
| 1.1.1.1 | Click project type -> ability to create **Template Types** (e.g., הכנת תב"ע, הכנת מצגת לדיירים, רישוי) | **NOT DONE** | Currently jumps straight to flat tabs. Client wants an intermediate level of "template types" (named categories like הכנת תב"ע). Each should have a "default" radio button so it auto-loads for entrepreneurs. |
| 1.1.1.1 (cont.) | Add **Index (מדד)** selection at this template type level | **NOT DONE** | The `fee_template_categories` table HAS `default_index_type` column but this level doesn't exist in the UI. Client wants index type set per template type. |
| 1.1.1.1.1 | Inside each template type -> **Submission Methods** (פאושלי, כמותי, שעתי) as tabs/sub-types | **NOT DONE** | The `fee_submission_methods` table EXISTS in DB but is unused. Client wants method tabs (פאושלי, כמותי, שעתי) with a "default" selection and a "Copy" (העתק) button to duplicate items between methods. |
| 1.1.1.1.1.1 | Inside each submission method -> Fee item rows exactly like the current "שורות שכ"ט" tab | **PARTIALLY DONE** | The fee item rows exist but at the wrong hierarchy level. They need to be nested under template type + submission method. |

### Section 2: Entrepreneur Side (עריכת בקשה)

| # | Requirement | Status | Details |
|---|------------|--------|---------|
| 2.1 | Service details tab should start first (default) | DONE | Services tab is the default tab |
| 2.2 | In service details, the "service list" should be the default, and templates (from 1.1.1.1) should populate as options | **PARTIALLY DONE** | Template loading exists but not connected to the new template type hierarchy |
| 2.2 (cont.) | Submission method selection (from 1.1.1.1.1) should appear in the same options list | **NOT DONE** | No submission method selection in entrepreneur view |
| 2.3 | Fix RFP request title in the "main" screen: should be "{project name} - בקשה להצעת מחיר עבור {template type} - סעיף {i.1.1}" | **NOT DONE** | Title format not updated |
| 2.4 | Add **Index (מדד)** below payment terms (שוטף 30+ etc.) | **PARTIALLY DONE** | Index section EXISTS in `PaymentTermsTab.tsx` with full implementation. But client wants it integrated with default from admin template level. |

---

## Implementation Plan

### Phase 1: Restore the Template Type Level (fee_template_categories)

The `fee_template_categories` table already exists with the right columns (`name`, `advisor_specialty`, `project_type`, `is_default`, `default_index_type`). It just has no data and the UI was removed.

**Changes:**
1. **`FeeTemplatesByAdvisorProject.tsx`** - Restructure to show a list of Template Types (categories) instead of directly showing tabs. Each category card shows:
   - Name (e.g., "הכנת תב"ע")
   - Default radio button
   - Index type badge
   - Edit/Delete actions
   - "הוסף סוג תבנית" (Add Template Type) button

2. **Create new page `FeeTemplatesByCategory.tsx`** - The actual template management page that shows tabs (שירותים, שורות שכ"ט, תשלום) but scoped to a specific category.

3. **`CreateFeeCategoryDialog.tsx`** already exists - Verify it works with the hierarchy (needs `advisor_specialty`, `project_type`, `name`, `default_index_type`, `is_default`).

4. **`EditFeeCategoryDialog.tsx`** already exists - Verify it works.

### Phase 2: Restore Submission Methods (fee_submission_methods)

The `fee_submission_methods` table exists with `category_id`, `method_type`, `method_label`, `is_default`.

**Changes:**
1. Inside the category detail page, add a **sub-level** for submission methods within the "שורות שכ"ט" tab:
   - Show method tabs (פאושלי, כמותי, שעתי) above the fee item rows
   - Each method is independently manageable
   - A "Copy" button duplicates items from one method to another
   - A "default" indicator for the auto-selected method

2. **`CreateSubmissionMethodDialog.tsx`** already exists - Hook it into the UI.

3. **Fee items should be linked to a `category_id`** - The `default_fee_item_templates` table needs to filter by category. Check if it has a `category_id` column.

### Phase 3: Wire Template Loading to Entrepreneur View

1. When entrepreneur clicks "טען תבנית" in the RFP editor:
   - First select template type (from `fee_template_categories` filtered by advisor + project)
   - Then auto-select the default submission method
   - Load fee items, services, and milestones scoped to that category + method

2. The default template type (marked `is_default`) should auto-load when entrepreneur first opens the editor.

### Phase 4: Title Format & Index Integration

1. Update RFP request title format to: "{project name} - בקשה להצעת מחיר עבור {template type name}"
2. Index type default from the template category should propagate to the entrepreneur's payment terms tab

---

## Database Check Required

Before implementation, verify these columns exist:

| Table | Column | Purpose |
|-------|--------|---------|
| `default_fee_item_templates` | `category_id` | Link fee items to template category |
| `default_service_scope_templates` | `category_id` | Link services to template category |
| `milestone_templates` | `category_id` | Link milestones to template category |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/admin/FeeTemplatesByAdvisorProject.tsx` | **Major rewrite** - Show template types (categories) list instead of direct tabs |
| `src/pages/admin/FeeTemplatesByCategory.tsx` | **New file** - Category detail page with services/fees/milestones tabs, submission method sub-tabs for fees |
| `src/hooks/useFeeTemplateHierarchy.ts` | Add category-level queries with submission method support |
| `src/components/admin/CreateFeeCategoryDialog.tsx` | Verify/update to work with new flow |
| `src/components/admin/EditFeeCategoryDialog.tsx` | Verify/update |
| `src/components/admin/CreateSubmissionMethodDialog.tsx` | Verify/update, add "Copy" functionality |
| `src/App.tsx` | Add route for new category detail page |
| `src/components/rfp/ServiceDetailsTab.tsx` | Update template loading to use new hierarchy |
| `src/components/rfp/FeeItemsTable.tsx` | Update template loading to use category + method |

---

## Priority & Complexity

- **Phase 1** (Template Types): Medium complexity - restructure existing page, tables exist
- **Phase 2** (Submission Methods): High complexity - new sub-tab level with copy functionality
- **Phase 3** (Entrepreneur wiring): Medium complexity - update template resolution logic
- **Phase 4** (Title + Index): Low complexity - string formatting + default propagation

Estimated total: This is a significant restructuring of the admin template hierarchy from a flat 3-tab system to a nested 5-level system.


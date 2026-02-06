
# Plan: Simplify RFP Template Structure

## Current Problem Analysis

The current 4-level hierarchy (Advisor Type → Project Type → Category → Submission Method) is overly complex and has issues:

1. **Category table is empty** - No categories exist in `fee_template_categories`
2. **Templates bypass hierarchy** - Current templates in `default_fee_item_templates` are only keyed by `advisor_specialty`, ignoring category/method
3. **Entrepreneur confusion** - The `ServiceDetailsTab` tries to show category/method selectors but finds no data
4. **Over-engineering** - Most advisors need just one template set per project type

## Proposed Solution: 3-Level Hierarchy

```
Level 1: סוג יועץ (Advisor Type)
    └── Level 2: סוג פרויקט (Project Type)
        └── Templates (3 Tabs):
            ├── שורות שכ"ט (Fee Items)
            ├── שירותים (Services)
            └── אבני דרך (Milestones)
```

The "submission method" (lump_sum/quantity/hourly) becomes a **property** of each fee item row, not a separate hierarchy level.

---

## Implementation Changes

### Part 1: Admin Interface Simplification

#### A. Remove Category Level
**File: `FeeTemplatesByProject.tsx`**
- When clicking a project type, go directly to templates view (not categories)
- Route: `/heyadmin/fee-templates/{advisorType}/{projectType}` → Templates page

#### B. Create New Unified Templates Page
**New File: `FeeTemplatesByAdvisorProject.tsx`**
- Replace `FeeTemplateCategories.tsx` and `FeeTemplateSubmissionMethods.tsx` with a single page
- Shows 3 tabs directly: Fee Items, Services, Milestones
- Templates are filtered by `advisor_specialty` + `project_type`

#### C. Update Routes
**File: `App.tsx`**
- Remove: `/heyadmin/fee-templates/:advisorType/:projectType/:categoryId` route
- Keep: `/heyadmin/fee-templates/:advisorType/:projectType` → New unified page

### Part 2: Database Queries Update

Update template loading to use `advisor_specialty` + `project_type`:

```typescript
// Fee Items
supabase.from('default_fee_item_templates')
  .select('*')
  .eq('advisor_specialty', advisorType)
  .or(`project_type.eq.${projectType},project_type.is.null`)
  .order('display_order');

// Services
supabase.from('default_service_scope_templates')
  .select('*')
  .eq('advisor_specialty', advisorType)
  .or(`project_type.eq.${projectType},project_type.is.null`)
  .order('display_order');

// Milestones
supabase.from('milestone_templates')
  .select('*')
  .or(`advisor_specialty.eq.${advisorType},advisor_specialty.is.null`)
  .or(`project_type.eq.${projectType},project_type.is.null`)
  .order('display_order');
```

### Part 3: Entrepreneur Flow Simplification

#### A. Simplify `ServiceDetailsTab.tsx`
- Remove category/method dropdowns
- Load templates directly based on `advisorType` + `projectType`
- Auto-load on component mount when in checklist mode

#### B. Simplify `FeeItemsTable.tsx` 
- Update `loadTemplates()` to filter by `advisorType` + `projectType`
- Remove any category/method dependencies

#### C. Simplify `PaymentTermsTab.tsx`
- Update `loadTemplate()` to filter by `advisorType` + `projectType`
- Remove `categoryId` prop dependency

### Part 4: Vendor Type Sync

#### A. Update Advisory Types Source
The ADVISOR_EXPERTISE constant in `advisor.ts` should be the canonical source. Ensure:

1. Admin template pages use `ADVISOR_EXPERTISE` from `advisor.ts`
2. RFP wizard continues to use JSON from Supabase Storage (this is intentional - allows dynamic updates)
3. Document that adding new advisor types requires updating both:
   - `src/constants/advisor.ts` (for admin)
   - `json/advisors_projects_full.json` in Supabase Storage (for wizard)

---

## File Changes Summary

| Action | File | Change |
|--------|------|--------|
| Create | `src/pages/admin/FeeTemplatesByAdvisorProject.tsx` | New unified templates page with 3 tabs |
| Modify | `src/pages/admin/FeeTemplatesByProject.tsx` | Click goes to new page, not categories |
| Delete | `src/pages/admin/FeeTemplateCategories.tsx` | No longer needed |
| Modify | `src/pages/admin/FeeTemplateSubmissionMethods.tsx` | Rename/repurpose for the new page |
| Modify | `src/App.tsx` | Update routes |
| Modify | `src/components/rfp/ServiceDetailsTab.tsx` | Remove category/method selectors |
| Modify | `src/components/rfp/FeeItemsTable.tsx` | Filter by advisor + project type |
| Modify | `src/components/rfp/PaymentTermsTab.tsx` | Remove categoryId dependency |
| Modify | `src/components/admin/CreateFeeItemTemplateDialog.tsx` | Add project_type field |

---

## New Admin Templates Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ← חזרה לסוגי פרויקטים                                        │
│                                                             │
│ אדריכל > מגורים בבנייה רוויה                                │
│ ═══════════════════════════════════════════════════════════ │
│                                                             │
│ ┌────────────┬────────────┬─────────────┐                  │
│ │ שורות שכ"ט │  שירותים   │  אבני דרך   │ ← Tabs           │
│ └────────────┴────────────┴─────────────┘                  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ + הוסף שורה                                           │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ תיאור          │ יחידה │ סוג חיוב │ אופציונלי │  🗑️  │  │
│ │ הכנת תכנית     │ פאושלי │ חד פעמי │    ❌     │  🗑️  │  │
│ │ ליווי מול רשויות │ שעתי  │ שעתי    │    ✓     │  🗑️  │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Entrepreneur Template Loading (After Changes)

When entrepreneur opens RFP editor for "אדריכל" on a "מגורים" project:

1. `ServiceDetailsTab` loads services from `default_service_scope_templates` where `advisor_specialty = 'אדריכל'` AND (`project_type = 'מגורים'` OR `project_type IS NULL`)

2. `FeeItemsTable` loads fee items from `default_fee_item_templates` with same filter

3. `PaymentTermsTab` loads milestones from `milestone_templates` with same filter

No category or submission method selection required - it just works.

---

## Migration Considerations

- The `fee_template_categories` and `fee_submission_methods` tables can be kept for now (they're empty anyway)
- Future cleanup: Remove the tables after confirming the new structure works
- Existing templates in `default_fee_item_templates` already have `advisor_specialty` - just need to add `project_type` values where applicable

---

## Testing Checklist

1. **Admin Flow**:
   - Navigate to תבניות קריאה להצעה
   - Select advisor type (e.g., אדריכל)
   - Select project type (e.g., מגורים בבנייה רוויה)
   - See 3 tabs: שורות שכ"ט, שירותים, אבני דרך
   - Add/edit/delete templates in each tab
   - Verify templates save with correct advisor_specialty + project_type

2. **Entrepreneur Flow**:
   - Create RFP for project
   - Open Request Editor for an advisor
   - Click "טען תבנית" in Fee Items tab → loads templates
   - Switch to Services tab in checklist mode → auto-loads services
   - Switch to Payment tab → click "טען תבנית" → loads milestones
   - Submit RFP and verify data is correct

3. **Vendor Type Sync**:
   - All advisor types from `advisor.ts` should appear in admin
   - Active project types should appear first with badges

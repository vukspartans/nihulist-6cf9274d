

# Hierarchical Fee Templates Management System

## Summary of Client Request

The client wants to restructure the Fee Templates (תבניות שכר טרחה) management in the admin panel from a flat list to a **5-level hierarchical navigation**:

```
Level 1: Advisor Types (אדריכל, יועץ קונסטרוקציה, etc.)
    └─ Level 2: Project Types (תמ"א 38/1, תמ"א 38/2, משרדים, etc.)
        └─ Level 3: Template Categories (הכנת תב"ע, רישוי, הכנת מצגת לדיירים, etc.) + Default toggle
            └─ Level 4: Submission Method Tabs (פאושלי, כמותי, שעתי) + Default toggle
                └─ Level 5: Fee Line Items (current functionality)
```

Additionally, entrepreneurs should be able to create their own custom templates via the "Edit Proposal" screen.

---

## Current State Analysis

| Component | Current State |
|-----------|---------------|
| Database table | `default_fee_item_templates` with only `advisor_specialty` as hierarchy key |
| Admin UI | Flat list filtered by advisor type, with tabs for Fee Items / Services / Milestones |
| Hierarchy support | Single level (advisor_specialty only) |
| Template categories | Not supported |
| Submission methods | Not supported |
| Default flag | Not supported |
| User templates | Not supported |

---

## Proposed Solution

### Phase 1: Database Schema Enhancement

Create new tables and modify existing ones to support the hierarchy:

**New Table: `fee_template_categories`**
```sql
CREATE TABLE fee_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                        -- e.g., "רישוי", "הכנת תב"ע"
  advisor_specialty TEXT NOT NULL,           -- e.g., "אדריכל"
  project_type TEXT,                         -- e.g., "תמ"א 38/2" (NULL = all)
  is_default BOOLEAN DEFAULT false,          -- Auto-select when creating RFP
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**New Table: `fee_submission_methods`**
```sql
CREATE TABLE fee_submission_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES fee_template_categories(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL,                 -- 'lump_sum' | 'quantity' | 'hourly'
  method_label TEXT NOT NULL,                -- "פאושלי" | "כמותי" | "שעתי"
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Modify: `default_fee_item_templates`**
```sql
ALTER TABLE default_fee_item_templates
  ADD COLUMN submission_method_id UUID REFERENCES fee_submission_methods(id),
  ADD COLUMN project_type TEXT,              -- Allow project-specific templates
  ADD COLUMN category_id UUID REFERENCES fee_template_categories(id),
  ADD COLUMN is_user_template BOOLEAN DEFAULT false,
  ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id);
```

---

### Phase 2: Admin UI Restructure

#### New Navigation Flow

**Level 1 - Advisor Type List (`/heyadmin/fee-templates`)**
```
┌─────────────────────────────────────────────────────┐
│ ניהול תבניות שכר טרחה                              │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │     אדריכל      │  │ יועץ קונסטרוקציה │           │
│ │   (6 תבניות)    │  │   (3 תבניות)    │           │
│ └─────────────────┘  └─────────────────┘           │
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │עורך דין מקרקעין │  │   יועץ חשמל      │           │
│ │   (6 תבניות)    │  │   (3 תבניות)    │           │
│ └─────────────────┘  └─────────────────┘           │
└─────────────────────────────────────────────────────┘
```

**Level 2 - Project Types (`/heyadmin/fee-templates/[advisorType]`)**
```
┌─────────────────────────────────────────────────────┐
│ ← חזרה │ אדריכל - סוגי פרויקטים                     │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │  תמ"א 38/1     │  │  תמ"א 38/2      │           │
│ │ (2 קטגוריות)   │  │ (3 קטגוריות)   │           │
│ └─────────────────┘  └─────────────────┘           │
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │    משרדים      │  │ מגורים בבנייה   │           │
│ │ (1 קטגוריה)    │  │  רוויה          │           │
│ └─────────────────┘  └─────────────────┘           │
│                                                     │
│ [+ הוסף סוג פרויקט]                                │
└─────────────────────────────────────────────────────┘
```

**Level 3 - Template Categories (`/heyadmin/fee-templates/[advisorType]/[projectType]`)**
```
┌─────────────────────────────────────────────────────┐
│ ← חזרה │ אדריכל > תמ"א 38/2                         │
├─────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐│
│ │ רישוי                           [ברירת מחדל ✓] ││
│ │ 3 שיטות הגשה                                    ││
│ └──────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────┐│
│ │ הכנת תב"ע                       [ברירת מחדל ○] ││
│ │ 2 שיטות הגשה                                    ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ [+ הוסף קטגוריה חדשה]                              │
└─────────────────────────────────────────────────────┘
```

**Level 4 - Submission Method Tabs (`/heyadmin/fee-templates/[advisorType]/[projectType]/[categoryId]`)**
```
┌─────────────────────────────────────────────────────┐
│ ← חזרה │ אדריכל > תמ"א 38/2 > רישוי                 │
├─────────────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────┐            │
│ │ פאושלי ★  │  כמותי    │   שעתי    │            │
│ └────────────┴────────────┴────────────┘            │
│                                                     │
│ ★ = ברירת מחדל                                     │
│                                                     │
│ ┌──────────────────────────────────────────────────┐│
│ │ שורות סעיפים (Level 5)                          ││
│ │ ┌────────────────────────────────────────────── ││
│ │ │ תיאור          │ יחידה │ כמות │ [פעולות]     ││
│ │ ├────────────────────────────────────────────── ││
│ │ │ הכנת תוכנית... │ קומפ' │  1   │ [✏️] [🗑️]   ││
│ │ │ בקרה מרחבית   │ קומפ' │  1   │ [✏️] [🗑️]   ││
│ │ └────────────────────────────────────────────── ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ [+ הוסף שורה חדשה]                                 │
└─────────────────────────────────────────────────────┘
```

---

### Phase 3: Files to Create/Modify

#### New Files

| File | Purpose |
|------|---------|
| `src/pages/admin/FeeTemplatesHierarchy.tsx` | Level 1: Advisor type grid |
| `src/pages/admin/FeeTemplatesByProject.tsx` | Level 2: Project types for advisor |
| `src/pages/admin/FeeTemplateCategories.tsx` | Level 3: Categories with default toggle |
| `src/pages/admin/FeeTemplateSubmissionMethods.tsx` | Level 4: Tabs with line items |
| `src/hooks/useFeeTemplateHierarchy.ts` | CRUD hooks for new tables |
| `src/components/admin/CreateFeeCategoryDialog.tsx` | Create category dialog |
| `src/components/admin/CreateSubmissionMethodDialog.tsx` | Create submission method dialog |
| `src/types/feeTemplateHierarchy.ts` | TypeScript types |

#### Modified Files

| File | Changes |
|------|---------|
| `src/components/admin/AdminLayout.tsx` | Update sidebar navigation |
| `src/App.tsx` | Add new routes for hierarchy pages |
| `src/hooks/useRFPTemplatesAdmin.ts` | Add hierarchy filtering support |
| `src/pages/admin/RFPTemplatesManagement.tsx` | Redirect to new hierarchy or keep for Services/Milestones |
| `src/components/rfp/FeeItemsTable.tsx` | Fetch templates using hierarchy filters |
| `src/components/RequestEditorDialog.tsx` | Support user template creation |

---

### Phase 4: User Template Creation

Allow entrepreneurs to save their customizations as personal templates:

1. Add "Save as Template" button in `RequestEditorDialog`
2. Create `SaveAsTemplateDialog` component
3. Store in `default_fee_item_templates` with:
   - `is_user_template = true`
   - `created_by_user_id = current_user.id`
4. Show user templates in RequestEditor with option to load

---

## Implementation Order

1. **Database migrations** - Create new tables and alter existing
2. **Type definitions** - Add TypeScript interfaces
3. **API hooks** - Create `useFeeTemplateHierarchy.ts`
4. **Level 1 page** - Advisor type grid view
5. **Level 2 page** - Project types with routing
6. **Level 3 page** - Categories with default toggle
7. **Level 4 page** - Submission method tabs + line items
8. **Navigation updates** - Sidebar and routes
9. **User templates** - Save/load in RequestEditorDialog
10. **Data migration** - Move existing templates to new structure

---

## Technical Considerations

### RTL Support
- All new dialogs use `dir="rtl"` on `DialogContent`
- Flex layouts use `flex-row-reverse` where needed
- Navigation breadcrumbs read right-to-left

### Default Toggle Behavior
- Only one category per advisor+project can be default
- Only one submission method per category can be default
- Database constraint or mutation logic enforces this

### Routing Structure
```
/heyadmin/fee-templates                              # Level 1
/heyadmin/fee-templates/:advisorType                 # Level 2
/heyadmin/fee-templates/:advisorType/:projectType    # Level 3
/heyadmin/fee-templates/:advisorType/:projectType/:categoryId  # Level 4
```

### Backward Compatibility
- Existing `default_fee_item_templates` records remain functional
- New columns are nullable with sensible defaults
- RFP wizard falls back to advisor-only filtering if no hierarchy match




# Plan: Simplify Template Creation Dialogs and Add Drag-and-Drop Ordering

## Understanding the Issue

The admin navigates through a specific hierarchy to get to the template creation page:
1. Select **Advisor Type** (e.g., "עורך דין מקרקעין")
2. Select **Project Type** (e.g., "פינוי־בינוי (מתחמים)")
3. Arrives at the template management page where they can add Milestones, Fee Items, and Services

**Current Problem**: The creation dialogs (especially Milestones) still show fields for:
- סוג פרויקט (Project Type) - already selected in navigation
- התמחות יועץ (Advisor Specialty) - already selected in navigation  
- עירייה (Municipality) - not relevant for this hierarchy

These fields are redundant because the context is already known from the URL parameters.

## Comparison with RFP Creation Process

Looking at `PaymentTermsTab.tsx`, when entrepreneurs add milestones in the RFP wizard, they only enter:
- **Description** (תיאור)
- **Percentage** (אחוז)

This is the simple, streamlined approach that should be mirrored in the admin template creation.

## Proposed Changes

### 1. Simplify CreateMilestoneTemplateDialog

**Remove Fields:**
- סוג פרויקט dropdown (line 144-163)
- עירייה dropdown (line 166-184)
- התמחות יועץ dropdown (line 187-206)

**Keep Fields:**
- שם (Name) - required
- שם באנגלית (English name) - optional
- תיאור (Description)
- אחוז מהסכום (Percentage) - required
- סכום קבוע (Fixed amount) - optional
- סוג טריגר (Trigger type) - important for automation

**Auto-populate from props:**
The `defaultAdvisorSpecialty` and `defaultProjectType` props are already passed from `FeeTemplatesByAdvisorProject.tsx` (lines 431-435). These should be used directly in submission without showing dropdowns.

**Simplify Layout:**
- Remove the tabs structure (basic/payment) since there are fewer fields
- Single-page form like the RFP creation milestones

### 2. Simplify CreateFeeItemTemplateDialog

**Remove Field:**
- סוג יועץ dropdown (lines 92-106) - already selected in navigation

**Keep Fields:**
- תיאור הפריט (Description) - required
- יחידת מדידה (Unit)
- כמות ברירת מחדל (Default quantity)
- סוג חיוב (Charge type)
- סמן כאופציונלי (Is optional toggle)

### 3. Simplify CreateServiceScopeTemplateDialog

**Remove Field:**
- סוג יועץ dropdown (lines 87-100) - already selected in navigation

**Keep Fields:**
- שם השירות (Service name) - required
- קטגוריית שכ"ט (Fee category)
- סמן כאופציונלי (Is optional toggle)

### 4. Add Drag-and-Drop Reordering to FeeTemplatesByAdvisorProject

The page currently uses regular `Table` components (lines 199-248, 276-317, 347-392). These should be converted to use `SortableDataTable` (which already exists and works well).

**Changes needed:**
1. Import `SortableDataTable` component
2. Add reorder hooks: `useReorderFeeItemTemplates`, `useReorderServiceScopeTemplates`, `useReorderMilestoneTemplates`
3. Replace each `Table` with `SortableDataTable`
4. Ensure the `display_order` field is present on all templates

---

## Technical Implementation

### File 1: `CreateMilestoneTemplateDialog.tsx`

**Changes:**
1. Remove the entire `<Tabs>` structure
2. Remove the 3 dropdown fields (project_type, municipality_id, advisor_specialty)
3. Create a simple single-form layout with:
   - Name + Name (EN) row
   - Description textarea
   - Percentage + Fixed amount row
   - Trigger type dropdown
4. Use `defaultAdvisorSpecialty` and `defaultProjectType` props directly in submission

**New Simplified Structure:**
```text
+----------------------------------+
| שם                 | שם באנגלית    |
+----------------------------------+
| תיאור                           |
+----------------------------------+
| אחוז מהסכום       | סכום קבוע     |
+----------------------------------+
| סוג טריגר                        |
+----------------------------------+
| [ביטול]                  [צור]   |
+----------------------------------+
```

### File 2: `CreateFeeItemTemplateDialog.tsx`

**Changes:**
1. Remove advisor_specialty dropdown (lines 92-106)
2. Remove the `advisorSpecialty` state variable
3. Use `defaultAdvisorSpecialty` prop directly in submission

### File 3: `CreateServiceScopeTemplateDialog.tsx`

**Changes:**
1. Remove advisor_specialty dropdown (lines 87-100)
2. Remove the `advisorSpecialty` state variable
3. Use `defaultAdvisorSpecialty` prop directly in submission

### File 4: `FeeTemplatesByAdvisorProject.tsx`

**Changes:**
1. Import `SortableDataTable` and reorder hooks
2. Add `display_order` property to columns
3. Replace all 3 `<Table>` components with `<SortableDataTable>`
4. Add `onReorder` handlers for each table

### File 5: Edit Dialogs (EditMilestoneTemplateDialog, EditFeeItemTemplateDialog, EditServiceScopeTemplateDialog)

**Changes:**
- Similar simplification as create dialogs
- Keep fields read-only or hidden for advisor_specialty/project_type since they're tied to the context

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/CreateMilestoneTemplateDialog.tsx` | Remove tabs, remove 3 dropdowns, simplify to single form |
| `src/components/admin/EditMilestoneTemplateDialog.tsx` | Remove 3 dropdowns, hide advisor/project fields |
| `src/components/admin/CreateFeeItemTemplateDialog.tsx` | Remove advisor_specialty dropdown |
| `src/components/admin/EditFeeItemTemplateDialog.tsx` | Remove advisor_specialty dropdown |
| `src/components/admin/CreateServiceScopeTemplateDialog.tsx` | Remove advisor_specialty dropdown |
| `src/components/admin/EditServiceScopeTemplateDialog.tsx` | Remove advisor_specialty dropdown |
| `src/pages/admin/FeeTemplatesByAdvisorProject.tsx` | Add SortableDataTable for drag-and-drop reordering |
| `src/hooks/useRFPTemplatesAdmin.ts` | Add reorder mutations if not present |

---

## Ordering Behavior

When the entrepreneur loads templates in the RFP wizard:
1. Templates are fetched filtered by `advisor_specialty` and `project_type`
2. They are ordered by `display_order` (ascending)
3. The order defined by admin via drag-and-drop is preserved

This is already implemented in the hooks (e.g., `useMilestoneTemplatesByAdvisorProject` orders by `display_order`).

---

## Testing Checklist

1. Navigate to /heyadmin/fee-templates/{advisor}/{project}
2. Click "הוסף אבן דרך" - verify simplified dialog with no redundant dropdowns
3. Click "הוסף שורה" - verify no advisor dropdown
4. Click "הוסף שירות" - verify no advisor dropdown
5. Create a new milestone with just name + percentage - verify it saves with correct advisor/project
6. Drag and drop rows to reorder - verify order persists
7. Load templates in RFP wizard - verify they appear in admin-defined order


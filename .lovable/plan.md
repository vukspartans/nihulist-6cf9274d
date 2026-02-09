

# Fix: RTL Alignment in Create Category Dialog + Submission Method Tabs Polish

## Changes Required

### 1. Fix RTL alignment in `CreateFeeCategoryDialog.tsx`
The Select dropdown for "מדד ברירת מחדל" needs proper RTL styling:
- Add `dir="rtl"` to `Select`, `SelectTrigger`, and `SelectContent`
- Add `className="text-right"` to `SelectTrigger`
- Placeholder "בחר מדד" is already set but may not show since `indexType` defaults to `cpi` -- keep it as-is since it has a default value

### 2. Fix RTL alignment in `CreateSubmissionMethodDialog.tsx`
Same RTL fix for the method type Select dropdown.

### 3. Polish Submission Method tabs in `FeeTemplatesByCategory.tsx`
Based on the client's reference image, the "שיטת ההגשה" (Submission Method) section inside the category detail page needs refinement:
- Move submission method tabs to be more prominent -- currently they're inside the "שורות שכ"ט" tab as sub-buttons. The client's reference shows them as a **top-level tab-like row** within the category page with:
  - Radio-style default selector (circle indicator) on each method
  - Icons for edit/delete/copy per method
  - A prominent "+ הוסף" button on the left
  - "ברירת מחדל" label column on the left side
- The current implementation already has the core logic (method tabs, default toggle, copy functionality) but the visual layout needs to match the client's wireframe

### Technical Details

| File | Change |
|------|--------|
| `src/components/admin/CreateFeeCategoryDialog.tsx` | Add `dir="rtl"` and `className="text-right"` to Select components |
| `src/components/admin/CreateSubmissionMethodDialog.tsx` | Add `dir="rtl"` and `className="text-right"` to Select components |
| `src/pages/admin/FeeTemplatesByCategory.tsx` | Restructure submission method section to match reference: table-like row layout with radio default, action icons (edit, delete, copy), and prominent add button |

### Visual Layout Target (from reference image)

The submission methods section should display as a structured table/list:
```text
שיטת ההגשה          ברירת מחדל    + הוסף
-----------------------------------------
[icons] פאושלי        (o)
[icons] כמותי         ( )
[icons] שעתי          ( )
```
Where:
- Each row has action icons (copy, edit, delete) on the right
- Method name in the center
- Radio-style default selector on the left
- "+ הוסף" button aligned to the left of the header


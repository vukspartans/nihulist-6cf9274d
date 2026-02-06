
# Plan: Fix Empty String SelectItem Values

## Problem

The Radix UI Select component throws an error when a `SelectItem` has `value=""` (empty string). This is by design - Radix reserves empty string to represent "no selection" for placeholder display.

**Error Location**: 
- `CreateMilestoneTemplateDialog.tsx` - 3 occurrences (lines 154, 175, 196)
- `EditMilestoneTemplateDialog.tsx` - 3 occurrences (lines 188, 209, 230)

## Solution

Replace `value=""` with a special non-empty placeholder value like `"__all__"`, then handle this value in the `onValueChange` handler to convert it back to empty string for the form state.

### Pattern to Apply

**Before:**
```tsx
<SelectItem value="" className="text-right">הכל</SelectItem>
```

**After:**
```tsx
<SelectItem value="__all__" className="text-right">הכל</SelectItem>
```

**Handler Update:**
```tsx
<Select
  value={watch("project_type") || "__all__"}
  onValueChange={(val) => setValue("project_type", val === "__all__" ? "" : val)}
>
```

---

## Implementation

### File 1: `CreateMilestoneTemplateDialog.tsx`

**Lines 147-161 (Project Type Select):**
```tsx
<Select
  dir="rtl"
  value={watch("project_type") || "__all__"}
  onValueChange={(val) => setValue("project_type", val === "__all__" ? "" : val)}
>
  <SelectTrigger dir="rtl" className="text-right">
    <SelectValue placeholder={t.dialog.projectTypeAll} />
  </SelectTrigger>
  <SelectContent dir="rtl">
    <SelectItem value="__all__" className="text-right">{t.dialog.projectTypeAll}</SelectItem>
    {PROJECT_TYPE_OPTIONS.map((type) => (...))}
  </SelectContent>
</Select>
```

**Lines 166-182 (Municipality Select):**
```tsx
<Select
  dir="rtl"
  value={watch("municipality_id") || "__all__"}
  onValueChange={(val) => setValue("municipality_id", val === "__all__" ? "" : val)}
>
  ...
  <SelectItem value="__all__" className="text-right">{t.dialog.municipalityAll}</SelectItem>
  ...
</Select>
```

**Lines 187-203 (Advisor Specialty Select):**
```tsx
<Select
  dir="rtl"
  value={watch("advisor_specialty") || "__all__"}
  onValueChange={(val) => setValue("advisor_specialty", val === "__all__" ? "" : val)}
>
  ...
  <SelectItem value="__all__" className="text-right">{t.dialog.advisorSpecialtyAll}</SelectItem>
  ...
</Select>
```

### File 2: `EditMilestoneTemplateDialog.tsx`

Apply the same pattern to the 3 Select components in this file:
- Project Type Select (around line 188)
- Municipality Select (around line 209)
- Advisor Specialty Select (around line 230)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/CreateMilestoneTemplateDialog.tsx` | Replace 3 empty string values with `"__all__"`, update handlers |
| `src/components/admin/EditMilestoneTemplateDialog.tsx` | Replace 3 empty string values with `"__all__"`, update handlers |

---

## Testing Checklist

1. Open Create Milestone Template dialog - no error
2. Open Edit Milestone Template dialog - no error
3. Select "הכל" option - form value becomes empty string
4. Select a specific option - form value updates correctly
5. Editing existing milestone with null values shows "הכל" selected
6. Form submission works correctly with both selected and "all" options

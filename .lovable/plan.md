

# Plan: Fix RTL Alignment in CreateMilestoneTemplateDialog

## Issues Identified

After comparing `CreateMilestoneTemplateDialog.tsx` with the properly aligned `CreateFeeItemTemplateDialog.tsx` and `CreateTaskTemplateDialog.tsx`, I found the following RTL issues:

### Issue 1: Tabs Component Missing `dir="rtl"`

The Tabs component doesn't have `dir="rtl"`, causing the tab order to display incorrectly (left-to-right instead of right-to-left).

**Current:**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
```

**Fix:**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4" dir="rtl">
```

### Issue 2: Input Fields Missing `text-right` Class

Hebrew text inputs should have `text-right` for proper alignment. Compare with `CreateFeeItemTemplateDialog` which has `className="text-right"` on inputs.

**Current:**
```tsx
<Input
  id="name"
  {...register("name", { required: true })}
  placeholder={t.dialog.namePlaceholder}
/>
```

**Fix:**
```tsx
<Input
  id="name"
  {...register("name", { required: true })}
  placeholder={t.dialog.namePlaceholder}
  className="text-right"
/>
```

### Issue 3: Textarea Missing `text-right` Class

Same issue for the description textarea.

### Issue 4: Number Inputs Need RTL Optimization

Per memory `memory/ui/rtl-numerical-input-alignment`, number inputs should use `text-right` and `dir="ltr"` for proper number display while maintaining RTL context.

**Current:**
```tsx
<Input
  id="percentage_of_total"
  type="number"
  ...
  className="pl-8"
/>
```

**Fix:**
```tsx
<Input
  id="percentage_of_total"
  type="number"
  ...
  className="pl-8 text-right"
  dir="ltr"
/>
```

### Issue 5: TabsList Missing `flex-row-reverse`

For proper RTL tab order, the tabs should appear in reverse visual order (first tab on right).

**Current:**
```tsx
<TabsList className="grid w-full grid-cols-2">
```

**Fix:**
```tsx
<TabsList className="grid w-full grid-cols-2" dir="rtl">
```

---

## Complete Changes

### File: `src/components/admin/CreateMilestoneTemplateDialog.tsx`

| Line | Change |
|------|--------|
| 101 | Add `dir="rtl"` to Tabs component |
| 102 | Add `dir="rtl"` to TabsList component |
| 111-115 | Add `className="text-right"` to name Input |
| 123-128 | Keep `dir="ltr"` on English name input (already correct) |
| 134-139 | Add `className="text-right"` to description Textarea |
| 215-228 | Add `dir="ltr"` and `text-right` to percentage Input |
| 245-252 | Add `dir="ltr"` and `text-right` to fixed_amount Input |

---

## Implementation Details

```tsx
// Line 101: Add dir="rtl" to Tabs
<Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4" dir="rtl">

// Line 102: Add dir="rtl" to TabsList  
<TabsList className="grid w-full grid-cols-2" dir="rtl">

// Line 111: Add text-right to name Input
<Input
  id="name"
  {...register("name", { required: true })}
  placeholder={t.dialog.namePlaceholder}
  className="text-right"
/>

// Line 134: Add text-right to description Textarea
<Textarea
  id="description"
  {...register("description")}
  placeholder="תיאור אבן הדרך..."
  rows={2}
  className="text-right"
/>

// Line 215: Fix percentage input with dir="ltr" and text-right
<Input
  id="percentage_of_total"
  type="number"
  step="0.01"
  min="0"
  max="100"
  {...register("percentage_of_total", {
    required: true,
    valueAsNumber: true,
    min: 0,
    max: 100,
  })}
  className="pl-8 text-right"
  dir="ltr"
/>

// Line 245: Fix fixed_amount input with dir="ltr" and text-right
<Input
  id="fixed_amount"
  type="number"
  step="0.01"
  min="0"
  {...register("fixed_amount", { valueAsNumber: true })}
  className="pl-10 text-right"
  dir="ltr"
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/CreateMilestoneTemplateDialog.tsx` | Add RTL attributes to Tabs, TabsList, Inputs, and Textarea |

---

## Testing Checklist

1. Open "הוספת אבן דרך חדשה" dialog
2. Verify tabs appear with "פרטי בסיס" on the RIGHT and "פרטי תשלום" on the LEFT
3. Verify all text inputs are right-aligned
4. Verify number inputs display numbers correctly (LTR) but remain positioned correctly in RTL context
5. Verify dropdown options are right-aligned
6. Verify buttons appear in correct RTL order (Cancel right, Create left)
7. Verify the dialog title and labels are right-aligned


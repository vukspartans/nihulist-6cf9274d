

# Plan: RTL Optimization for Admin Template Creation Dialogs

## Analysis Summary

I reviewed the 6 dialog components used in template creation/editing:

| Dialog | File | Status |
|--------|------|--------|
| Create Milestone | `CreateMilestoneTemplateDialog.tsx` | Mostly RTL-compliant, minor issues |
| Edit Milestone | `EditMilestoneTemplateDialog.tsx` | Mostly RTL-compliant, minor issues |
| Create Fee Item | `CreateFeeItemTemplateDialog.tsx` | RTL issues found |
| Edit Fee Item | `EditFeeItemTemplateDialog.tsx` | RTL issues found |
| Create Service | `CreateServiceScopeTemplateDialog.tsx` | RTL issues found |
| Edit Service | `EditServiceScopeTemplateDialog.tsx` | RTL issues found |

## Issues Found

### Issue 1: SelectContent Missing `dir="rtl"`

**Affected Files**: All 6 dialogs

The `SelectContent` component needs `dir="rtl"` for proper RTL alignment of dropdown items. Some dialogs have it, some don't.

**Pattern from RFP wizard (FeeItemsTable.tsx):**
```tsx
<Select dir="rtl" value={...}>
  <SelectTrigger dir="rtl" className="w-full text-right">
    <SelectValue />
  </SelectTrigger>
  <SelectContent dir="rtl">  // <-- Must have dir="rtl"
    <SelectItem key={...} value={...} className="text-right">
      {label}
    </SelectItem>
  </SelectContent>
</Select>
```

### Issue 2: Switch Position for RTL

**Affected Files**: All dialogs with Switch component

Per memory `memory/admin/ui-optimization-and-rtl-standards`, the Switch is isolated with `dir="ltr"` (already done in switch.tsx). However, per memory `memory/features/payment-budgetary-control-foundation`, the label/checkbox positioning in RTL should have text on RIGHT, control on LEFT.

Currently the dialogs have:
```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="is_optional">סמן כאופציונלי</Label>
  <Switch ... />
</div>
```

This is correct for RTL (label on right via justify-between, switch on left).

### Issue 3: Footer Button Order

**Affected Files**: Fee Item and Service dialogs

Per memory `memory/style/rtl-footer-button-order`: In RTL footers, the visual order follows Hebrew reading direction: Cancel in center, primary Action on far LEFT.

Current pattern in Fee/Service dialogs:
```tsx
<DialogFooter className="flex-row-reverse gap-2">
  <Button variant="outline">ביטול</Button>  // Cancel - appears RIGHT
  <Button type="submit">צור פריט</Button>   // Primary - appears LEFT
</DialogFooter>
```

This is **correct** because `DialogFooter` already has `flex-row-reverse` and `justify-start`.

### Issue 4: Missing Tabs Component in Fee/Service Dialogs

**Observation**: The Milestone dialogs use tabs for organization (basic/payment/tasks), but Fee Item and Service dialogs are simpler single-page forms. This is intentional and appropriate given their simpler structure.

### Issue 5: Input Text Alignment

**Affected Files**: All dialogs

Some inputs have `className="text-right"` and some don't. For consistency in RTL, all text inputs should have `text-right` class.

### Issue 6: Number Input Positioning (Percentage/Amount Fields)

**Affected Files**: Milestone dialogs

The percentage and amount inputs have suffix symbols (% and ₪) positioned with `left-3`. In RTL context, this should remain `left-3` since numbers read LTR but the symbol should appear on the visual left (end of number).

This is **correct** per memory `memory/ui/rtl-numerical-input-alignment`.

---

## Implementation Plan

### File 1: `CreateFeeItemTemplateDialog.tsx`

1. Add `dir="rtl"` to all `SelectContent` components (4 occurrences)
2. Add `className="text-right"` to all `SelectItem` components for consistency

### File 2: `EditFeeItemTemplateDialog.tsx`

Same changes as File 1.

### File 3: `CreateServiceScopeTemplateDialog.tsx`

Same changes as File 1.

### File 4: `EditServiceScopeTemplateDialog.tsx`

Same changes as File 1.

### File 5: `CreateMilestoneTemplateDialog.tsx`

Already has `dir="rtl"` on most SelectContent. Verify consistency.

### File 6: `EditMilestoneTemplateDialog.tsx`

Already has `dir="rtl"` on most SelectContent. Verify consistency.

---

## Detailed Changes

### CreateFeeItemTemplateDialog.tsx

**Line 98**: Add `dir="rtl"` to SelectContent
```tsx
// Before
<SelectContent>

// After
<SelectContent dir="rtl">
```

**Line 127**: Add `dir="rtl"` to SelectContent
```tsx
// Before
<SelectContent>

// After
<SelectContent dir="rtl">
```

**Line 157**: Add `dir="rtl"` to SelectContent
```tsx
// Before
<SelectContent>

// After
<SelectContent dir="rtl">
```

**Lines 100, 129, 159**: Add `className="text-right"` to SelectItem
```tsx
// Before
<SelectItem key={expertise} value={expertise}>

// After
<SelectItem key={expertise} value={expertise} className="text-right">
```

### EditFeeItemTemplateDialog.tsx

Apply same pattern:
- Line 89, 118, 148: Add `dir="rtl"` to SelectContent
- Lines 91, 120, 150: Add `className="text-right"` to SelectItem

### CreateServiceScopeTemplateDialog.tsx

Apply same pattern:
- Line 93, 121: Add `dir="rtl"` to SelectContent
- Lines 95, 123: Add `className="text-right"` to SelectItem

### EditServiceScopeTemplateDialog.tsx

Apply same pattern:
- Line 83, 111: Add `dir="rtl"` to SelectContent
- Lines 85, 113: Add `className="text-right"` to SelectItem

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/CreateFeeItemTemplateDialog.tsx` | Add `dir="rtl"` to 3 SelectContent, add `text-right` to SelectItems |
| `src/components/admin/EditFeeItemTemplateDialog.tsx` | Add `dir="rtl"` to 3 SelectContent, add `text-right` to SelectItems |
| `src/components/admin/CreateServiceScopeTemplateDialog.tsx` | Add `dir="rtl"` to 2 SelectContent, add `text-right` to SelectItems |
| `src/components/admin/EditServiceScopeTemplateDialog.tsx` | Add `dir="rtl"` to 2 SelectContent, add `text-right` to SelectItems |

---

## Testing Checklist

1. Open Create Fee Item dialog - verify dropdown items are right-aligned
2. Open Edit Fee Item dialog - verify same
3. Open Create Service dialog - verify dropdown items are right-aligned
4. Open Edit Service dialog - verify same
5. Open Create Milestone dialog - confirm already working
6. Open Edit Milestone dialog - confirm already working
7. Verify Switch toggle still works correctly (isolated LTR)
8. Verify footer buttons appear in correct RTL order (Cancel right, Action left)
9. Test on both desktop and mobile viewport sizes


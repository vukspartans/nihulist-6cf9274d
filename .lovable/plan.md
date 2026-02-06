

# Plan: Fix "סקירה אחרונה לפני הגשה" (Final Review) Dialog

## Problem Summary

The `ConfirmProposalDialog` has three main issues:
1. **Scrolling not working** - Users cannot scroll to see all content
2. **Missing fields** - Timeline days, scope, units, and VAT disclaimer are not displayed
3. **Code cleanup needed** - Unused props, missing accessibility, RTL alignment issues

---

## Root Cause Analysis

### Scrolling Issue
The `ScrollArea` component uses Radix UI's implementation which requires an explicit height constraint. Currently:

```tsx
<AlertDialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
  <AlertDialogHeader ... />
  <ScrollArea className="flex-1 px-6">  {/* ❌ flex-1 without min-h-0 */}
    ...
  </ScrollArea>
  <AlertDialogFooter ... />
</AlertDialogContent>
```

**Problem**: In a flex container, `flex-1` allows growing but the child's `h-full` doesn't get a computed height without `min-h-0` on the parent. This causes the content to overflow without triggering scrolling.

### Missing Fields
- `timelineDays` - passed but never rendered
- `scopeText` - passed but never used  
- `unit` - exists in interface but not shown in fee breakdown
- VAT disclaimer - required per project standards

---

## Implementation Plan

### 1. Fix Scrolling

Update the `AlertDialogContent` and `ScrollArea` to ensure proper height constraints:

```tsx
<AlertDialogContent className="max-w-2xl !h-[85vh] flex flex-col p-0" dir="rtl">
  <AlertDialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
    ...
  </AlertDialogHeader>
  
  <ScrollArea className="flex-1 min-h-0 px-6">
    ...
  </ScrollArea>
  
  <AlertDialogFooter className="px-6 py-4 border-t bg-background flex-shrink-0 ...">
    ...
  </AlertDialogFooter>
</AlertDialogContent>
```

**Key changes:**
- Use `!h-[85vh]` instead of `max-h-[85vh]` to ensure fixed height
- Add `flex-shrink-0` to header and footer to prevent them from shrinking
- Add `min-h-0` to ScrollArea to allow flex children to shrink below content size

### 2. Add Missing Fields

#### Add Timeline Days Display
```tsx
{/* Timeline - between total and fee items */}
{parseInt(timelineDays) > 0 && (
  <div className="flex items-center justify-between p-4 border rounded-lg">
    <Label className="text-muted-foreground text-xs">לו"ז מוערך</Label>
    <Badge variant="secondary">{timelineDays} ימים</Badge>
  </div>
)}
```

#### Add Unit to Fee Items
Update the fee item display to show unit information:
```tsx
<div className="flex justify-between items-center text-sm py-1 border-b border-muted last:border-0">
  <div className="flex flex-col">
    <span className="text-muted-foreground">{item.description}</span>
    {item.unit && item.quantity && (
      <span className="text-xs text-muted-foreground/70">
        {item.quantity} × {getUnitLabel(item.unit)}
      </span>
    )}
  </div>
  <span className="font-medium">₪{item.total.toLocaleString('he-IL')}</span>
</div>
```

#### Add VAT Disclaimer
Per project standards, add at the bottom of the scroll area:
```tsx
<p className="text-xs text-muted-foreground text-center pt-2 border-t">
  * כל המחירים ללא מע"מ | הצעה תקפה ל-30 יום
</p>
```

### 3. Fix RTL and Accessibility

#### RTL Currency Display
Per memory, manually prepend ₪ for proper RTL:
```tsx
// Instead of: formatCurrency(amount)
// Use: ₪{amount.toLocaleString('he-IL')}
```

#### Footer RTL Layout
Fix footer layout for proper RTL button ordering:
```tsx
<AlertDialogFooter className="px-6 py-4 border-t bg-background flex-shrink-0" dir="rtl">
  <div className="flex w-full items-center justify-between">
    {/* PDF button on right in RTL */}
    <Button variant="outline" size="sm" onClick={handleExportPDF} ...>
      ...
    </Button>
    
    {/* Action buttons on left in RTL */}
    <div className="flex gap-2">
      <AlertDialogCancel>חזרה לעריכה</AlertDialogCancel>
      <AlertDialogAction onClick={onConfirm} ...>
        הגש הצעת מחיר רשמית
      </AlertDialogAction>
    </div>
  </div>
</AlertDialogFooter>
```

### 4. Code Cleanup

1. **Remove unused `scopeText` parameter** - or add display if needed
2. **Use stable keys** - Replace `idx` with item IDs where available
3. **Add accessibility attributes**:
   - `role="status"` on summary sections
   - `aria-label` on interactive elements
4. **Update declaration validity period** - Memory indicates 30 days, not 90 days
5. **Type improvements** - Add proper unit type to interface

### 5. Updated Interface

```tsx
interface FeeLineItem {
  id?: string;           // Add for stable keys
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total: number;
  is_optional?: boolean;
}
```

---

## Complete File Changes

### File: `src/components/ConfirmProposalDialog.tsx`

Full refactor with:
- Fixed scrolling with proper flex/height constraints
- Timeline days display
- Unit labels in fee items
- VAT disclaimer
- RTL-compliant footer
- Cleaned up unused props
- Accessibility improvements
- Stable keys for list items

---

## Testing Checklist

1. Open proposal submission page
2. Fill in all required fields and click "הגש הצעת מחיר רשמית"
3. **Verify scrolling works** - scroll down to see all content
4. **Verify all fields shown**:
   - Total price prominently displayed
   - Timeline days (if provided)
   - Mandatory fee items with unit info
   - Optional fee items (if any)
   - Payment milestones (if any)
   - File count
   - Signature status
   - VAT disclaimer at bottom
5. **Verify RTL alignment** - all text right-aligned, buttons in correct order
6. **Test PDF export** - click export button
7. **Test on mobile** - ensure dialog is usable on small screens


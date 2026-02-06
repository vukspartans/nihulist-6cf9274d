
# Plan: Template Management Cleanup and RTL Fixes

## Problem Summary

Based on the current codebase analysis, I've identified three main issues:

### 1. Outdated Category Count Displays
The advisor type cards in `FeeTemplatesHierarchy.tsx` (line 69) show "X קטגוריות" which is no longer relevant since we removed the category hierarchy. Similarly, `FeeTemplatesByProject.tsx` (line 95-96) shows "פעיל" / "טרם הוגדר" based on `category_count` which is always 0.

### 2. Template Field Alignment Issues
Comparing Admin template dialogs with Entrepreneur RFP forms:

| Field | Admin Template | Entrepreneur FeeItemsTable | Status |
|-------|----------------|---------------------------|--------|
| Description | Yes | Yes | OK |
| Unit | Yes | Yes | OK |
| Quantity | Yes | Yes | OK |
| Charge Type | Yes | Yes | OK |
| Duration | **Missing** | Yes | **Need to add** |
| Is Optional | Yes | Yes | OK |

The admin fee item template dialog doesn't include `duration` field, but the entrepreneur form now supports it.

### 3. RTL Alignment Issues
Several components need RTL fixes:
- Dialog footers have button order issues (Cancel should be on the right in RTL)
- Some Select components missing `dir="rtl"` on SelectContent
- Table headers using `text-right` instead of `text-start` (logical property)

---

## Solution

### Part 1: Update Advisor Type Cards (FeeTemplatesHierarchy.tsx)

**Current (lines 68-72):**
```tsx
<div className="flex items-center gap-4 text-sm text-muted-foreground">
  <span>{advisor.category_count} קטגוריות</span>
  <span>•</span>
  <span>{advisor.template_count} תבניות</span>
</div>
```

**Updated:**
```tsx
<div className="text-sm text-muted-foreground">
  {advisor.template_count > 0 ? (
    <span>{advisor.template_count} תבניות</span>
  ) : (
    <span className="text-muted-foreground/60">טרם הוגדרו תבניות</span>
  )}
</div>
```

Also update `useAdvisorTypeSummary` hook to count templates directly without categories.

### Part 2: Update Project Type Cards (FeeTemplatesByProject.tsx)

**Current approach:** Based on `category_count` from `fee_template_categories` table (always 0)

**New approach:** Count actual templates from all 3 tables:
- `default_fee_item_templates` where `advisor_specialty` + `project_type`
- `default_service_scope_templates` where `advisor_specialty` + `project_type`
- `milestone_templates` where `advisor_specialty` + `project_type`

**Display logic:**
```tsx
<Badge variant={hasTemplates ? "default" : "secondary"}>
  {hasTemplates ? `${totalTemplates} תבניות` : "טרם הוגדר"}
</Badge>
```

### Part 3: Add Duration Field to Admin Fee Item Dialog

Update `CreateFeeItemTemplateDialog.tsx` and `EditFeeItemTemplateDialog.tsx`:

Add state:
```tsx
const [duration, setDuration] = useState<number | undefined>(undefined);
```

Add conditional field (when charge_type is recurring):
```tsx
{isRecurringChargeType(chargeType) && (
  <div className="space-y-2">
    <Label htmlFor="duration">משך ברירת מחדל</Label>
    <div className="flex items-center gap-2">
      <Input
        id="duration"
        type="number"
        min={1}
        value={duration || ''}
        onChange={(e) => setDuration(parseInt(e.target.value) || undefined)}
        className="text-right"
        placeholder="12"
      />
      <span className="text-sm text-muted-foreground">
        {getDurationUnitLabel(chargeType)}
      </span>
    </div>
  </div>
)}
```

### Part 4: RTL Fixes

#### A. Dialog Footer Button Order
All dialog footers should follow RTL standard (per memory):
- Primary action on far left
- Cancel in center
- Utility actions on far right

**Fix pattern:**
```tsx
<DialogFooter className="flex-row-reverse gap-2">
  <Button type="button" variant="outline" onClick={onClose}>
    ביטול
  </Button>
  <Button type="submit">
    {isPending ? "שומר..." : "שמור"}
  </Button>
</DialogFooter>
```

Files to fix:
- `CreateFeeItemTemplateDialog.tsx`
- `CreateServiceScopeTemplateDialog.tsx`
- `CreateMilestoneTemplateDialog.tsx`
- `EditFeeItemTemplateDialog.tsx`
- `EditServiceScopeTemplateDialog.tsx`
- `EditMilestoneTemplateDialog.tsx`

#### B. Table Headers
Change `text-right` to `text-start` for automatic RTL/LTR compatibility:
```tsx
<TableHead className="text-start">תיאור</TableHead>
```

Already using correct approach in `FeeTemplatesByAdvisorProject.tsx`.

#### C. SelectContent RTL
Ensure all SelectContent have proper RTL:
```tsx
<SelectContent dir="rtl">
```

---

## Updated Hook: useProjectTypeSummary

Replace category-based counting with template-based counting:

```typescript
export function useProjectTypeSummary(advisorSpecialty: string) {
  return useQuery({
    queryKey: [HIERARCHY_KEY, "project-summary", advisorSpecialty],
    queryFn: async () => {
      // Count fee item templates per project type
      const { data: feeItems } = await supabase
        .from("default_fee_item_templates")
        .select("project_type")
        .eq("advisor_specialty", advisorSpecialty);

      // Count service templates per project type  
      const { data: services } = await supabase
        .from("default_service_scope_templates")
        .select("project_type")
        .eq("advisor_specialty", advisorSpecialty);

      // Count milestone templates per project type
      const { data: milestones } = await supabase
        .from("milestone_templates")
        .select("project_type")
        .eq("advisor_specialty", advisorSpecialty);

      // Aggregate counts by project type
      const projectMap = new Map<string, number>();
      
      [...(feeItems || []), ...(services || []), ...(milestones || [])].forEach((t) => {
        const pt = t.project_type || null;
        if (pt) {
          projectMap.set(pt, (projectMap.get(pt) || 0) + 1);
        }
      });

      return Array.from(projectMap.entries()).map(([project_type, template_count]) => ({
        project_type,
        template_count,
      }));
    },
    enabled: !!advisorSpecialty,
  });
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/FeeTemplatesHierarchy.tsx` | Replace category count with template count display |
| `src/pages/admin/FeeTemplatesByProject.tsx` | Use template count instead of category count |
| `src/hooks/useFeeTemplateHierarchy.ts` | Update `useAdvisorTypeSummary` and `useProjectTypeSummary` to count templates |
| `src/components/admin/CreateFeeItemTemplateDialog.tsx` | Add duration field, fix RTL footer |
| `src/components/admin/EditFeeItemTemplateDialog.tsx` | Add duration field, fix RTL footer |
| `src/components/admin/CreateServiceScopeTemplateDialog.tsx` | Fix RTL footer button order |
| `src/components/admin/EditServiceScopeTemplateDialog.tsx` | Fix RTL footer button order |
| `src/components/admin/CreateMilestoneTemplateDialog.tsx` | Fix RTL footer button order |
| `src/components/admin/EditMilestoneTemplateDialog.tsx` | Fix RTL footer button order |

---

## Testing Checklist

1. **Advisor Type Grid (FeeTemplatesHierarchy)**:
   - [ ] Shows "X תבניות" when templates exist
   - [ ] Shows "טרם הוגדרו תבניות" when empty
   - [ ] No reference to "קטגוריות"

2. **Project Type Grid (FeeTemplatesByProject)**:
   - [ ] Active projects (with templates) sorted first
   - [ ] Shows badge with "X תבניות" or "טרם הוגדר"
   - [ ] Click navigates to template management page

3. **Create Fee Item Dialog**:
   - [ ] Duration field appears when charge_type is recurring
   - [ ] Duration field hidden for one_time
   - [ ] Buttons in correct RTL order (Cancel right, Submit left)

4. **Edit Fee Item Dialog**:
   - [ ] Duration field pre-populated if exists
   - [ ] Duration field conditional on charge_type

5. **All RTL Elements**:
   - [ ] Dialog footers have correct button order
   - [ ] Select dropdowns properly RTL aligned
   - [ ] Table headers use logical properties

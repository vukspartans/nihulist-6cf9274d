

# Plan: Optimize Space & Position "טען תבנית" in Header Row

## Task 1: Move "טען תבנית" Button to Header Row (רשימת שירותים)

### Current State (ServiceDetailsTab.tsx lines 315-390)
The checklist section header and the Load Template button are in separate locations:
- **Header row (line 315-326)**: Contains the title "רשימת שירותים" + badge + chevron
- **Inside content (line 329-390)**: Contains the dropdowns + Load Template button

### Proposed Change
Move the LoadTemplateButton into the CollapsibleTrigger row, positioned on the left side (end of the row in RTL):

```
Current:
┌─────────────────────────────────────────────────┐
│ ▼ רשימת שירותים [2/5]                     ◀ │
├─────────────────────────────────────────────────┤
│ [Category ▼] [Method ▼]    [✨ טען תבנית]      │
│ ...                                             │
└─────────────────────────────────────────────────┘

Proposed:
┌─────────────────────────────────────────────────┐
│ ▼ רשימת שירותים [2/5]     [✨ טען תבנית]  ◀ │
├─────────────────────────────────────────────────┤
│ [Category ▼] [Method ▼]                         │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

**Technical Implementation:**
- Move `LoadTemplateButton` inside the `CollapsibleTrigger` wrapper
- Add `onClick` stopPropagation to prevent collapsible toggle
- Update the trigger to use a flex layout with the button on the left

---

## Task 2: UX Review - All Four Tabs

### Tab 1: פירוט שירותים (ServiceDetailsTab.tsx)

**Current Issues:**
1. Template dropdowns (Category + Method) still take a full row even though button moved
2. Duplicate "רשימת שירותים" label inside the content (line 393)
3. Helper text below service list is redundant with header

**Optimizations:**
- Remove the duplicate "רשימת שירותים" label (line 392-397) - already in header
- Move Category/Method dropdowns to a compact inline format
- Reduce vertical spacing in checklist items

### Tab 2: שכר טרחה (FeeItemsTable.tsx)

**Current State (lines 173-195):**
Good layout - button and "הוסף שורה" in the same row, title on opposite side.

**Minor Issues:**
- Empty state message (line 306-309) uses `border rounded-lg p-6` - could be `p-4` for consistency

**Optimization:**
- Reduce empty state padding from `p-6` to `p-4`

### Tab 3: תשלום (PaymentTermsTab.tsx)

**Current State (lines 152-159):**
The "אבני דרך לתשלום" label and LoadTemplateButton are on the same row - **Already correct!**

**Current Issues:**
- Index section (lines 272-323) has `p-4` padding - could be reduced to `p-3`
- Notes textarea uses `rows={2}` and `min-h-[60px]` - slightly tall for notes

**Optimizations:**
- Reduce index section padding from `p-4` to `p-3`
- Keep notes as-is (reasonable height)

### Tab 4: מידע וקבצים (RequestEditorDialog.tsx lines 825-1148)

**Current State:**
- Request title: compact (space-y-1)
- Request content: has preview/edit toggle, well-designed
- Project files: collapsible, good design
- File upload: compact with badges

**Current Issues:**
- space-y-3 between sections (line 825) could be reduced to space-y-2 for tighter layout
- Helper text in project files section adds clutter when no files exist

**Optimizations:**
- Reduce section spacing from `space-y-3` to `space-y-2`

---

## Technical Implementation Details

### File 1: `src/components/rfp/ServiceDetailsTab.tsx`

**Change 1: Move LoadTemplateButton to header row**
Update lines 315-326:

```tsx
<CollapsibleTrigger asChild>
  <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors cursor-pointer">
    <div className="flex items-center gap-2">
      <List className="h-4 w-4 text-primary" />
      <span className="font-medium">רשימת שירותים</span>
      {scopeItems.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {scopeItems.filter(i => i.is_included).length}/{scopeItems.length}
        </Badge>
      )}
    </div>
    <div className="flex items-center gap-2">
      <div onClick={(e) => e.stopPropagation()}>
        <LoadTemplateButton
          onClick={() => selectedCategoryId && loadTemplatesForCategory(selectedCategoryId)}
          loading={loadingTemplates}
          disabled={!advisorType || !selectedCategoryId}
        />
      </div>
      <ChevronDown className={`h-4 w-4 transition-transform ${checklistOpen ? 'rotate-180' : ''}`} />
    </div>
  </div>
</CollapsibleTrigger>
```

**Change 2: Remove duplicate label inside content**
Remove lines 392-397 (the redundant "רשימת שירותים" label and helper text)

**Change 3: Keep only the dropdowns row, remove button from there**
Update lines 329-390 to only show category/method dropdowns (remove LoadTemplateButton from this row)

### File 2: `src/components/rfp/FeeItemsTable.tsx`

**Change: Reduce empty state padding**
Line 306: Change `p-6` to `p-4`
Line 421: Change `py-8` to `py-6`

### File 3: `src/components/rfp/PaymentTermsTab.tsx`

**Change: Reduce index section padding**
Line 272: Change `p-4` to `p-3`

### File 4: `src/components/RequestEditorDialog.tsx`

**Change: Reduce section spacing in מידע וקבצים tab**
Line 825: Change `space-y-3` to `space-y-2`

---

## Summary of Space Savings

| Area | Change | Space Saved |
|------|--------|-------------|
| Service checklist | Button in header row | ~40px (one row) |
| Service checklist | Remove duplicate label | ~24px |
| Fee table empty state | Reduce padding | ~16px |
| Payment index section | Reduce padding | ~8px |
| Info tab sections | Tighter spacing | ~8px per section |

**Total estimated savings: ~100px+ vertical space**

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/rfp/ServiceDetailsTab.tsx` | Move button to header, remove duplicate label |
| `src/components/rfp/FeeItemsTable.tsx` | Reduce empty state padding |
| `src/components/rfp/PaymentTermsTab.tsx` | Reduce index section padding |
| `src/components/RequestEditorDialog.tsx` | Reduce section spacing in info tab |


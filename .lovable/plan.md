
# Plan: Fix RTL Alignment in Template Management Page

## Issues Identified

### 1. Tab Order
The current tab order is: שורות שכ"ט → שירותים → אבני דרך (left to right in DOM)

In RTL, this appears as: אבני דרך ← שירותים ← שורות שכ"ט (reversed visually)

**User Request**: The correct visual order from right to left should be:
- שירותים (Services) - first/right
- שכ"ט (Fee Items) - middle  
- תשלום/אבני דרך (Milestones) - last/left

**Solution**: Reorder the TabsTrigger elements in the DOM so they appear correctly in RTL:
```
DOM Order: services → fee-items → milestones
RTL Visual: שירותים | שכ"ט | אבני דרך
```

### 2. Table RTL
The tables inherit `dir="rtl"` from the parent div, but need explicit handling for:
- Action buttons should be on the right (first column in RTL)
- Content should flow right-to-left

**Solution**: Move the actions column to be first in the DOM (appears on right in RTL), and ensure tables have proper RTL inheritance.

---

## Implementation

### Part 1: Reorder Tabs (lines 156-179)

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
  <TabsList className="grid w-full grid-cols-3" dir="rtl">
    {/* Order: services first (right), fee-items (middle), milestones (left) */}
    <TabsTrigger value="services" className="gap-2">
      <Briefcase className="h-4 w-4" />
      שירותים
      {services && services.length > 0 && (
        <Badge variant="secondary" className="mr-1">{services.length}</Badge>
      )}
    </TabsTrigger>
    <TabsTrigger value="fee-items" className="gap-2">
      <FileText className="h-4 w-4" />
      שורות שכ"ט
      {feeItems && feeItems.length > 0 && (
        <Badge variant="secondary" className="mr-1">{feeItems.length}</Badge>
      )}
    </TabsTrigger>
    <TabsTrigger value="milestones" className="gap-2">
      <Milestone className="h-4 w-4" />
      אבני דרך / תשלום
      {milestones && milestones.length > 0 && (
        <Badge variant="secondary" className="mr-1">{milestones.length}</Badge>
      )}
    </TabsTrigger>
  </TabsList>
  ...
</Tabs>
```

### Part 2: Fix Table Column Order

For each table, move the actions column to be **first** (so it appears on the right in RTL):

**Fee Items Table:**
```tsx
<TableRow>
  <TableHead className="w-24"></TableHead>  {/* Actions - now first (right in RTL) */}
  <TableHead>תיאור</TableHead>
  <TableHead>יחידה</TableHead>
  <TableHead>כמות ברירת מחדל</TableHead>
  <TableHead>סוג חיוב</TableHead>
  <TableHead>סטטוס</TableHead>
</TableRow>
```

And corresponding body cells:
```tsx
<TableRow key={item.id}>
  <TableCell>
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => setEditingFeeItem(item)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteFeeItemId(item.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </TableCell>
  <TableCell className="font-medium">{item.description}</TableCell>
  <TableCell>{item.unit}</TableCell>
  <TableCell>{item.default_quantity || "-"}</TableCell>
  <TableCell>{item.charge_type || "-"}</TableCell>
  <TableCell>...</TableCell>
</TableRow>
```

Apply same pattern to Services and Milestones tables.

### Part 3: Change Default Tab

Update initial state to start on "services" tab:
```tsx
const [activeTab, setActiveTab] = useState<string>("services");
```

### Part 4: Rename "אבני דרך" to "תשלום"

Per user request, rename the milestones tab to reflect payment terms:
```tsx
<TabsTrigger value="milestones" className="gap-2">
  <Milestone className="h-4 w-4" />
  תשלום
  ...
</TabsTrigger>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/FeeTemplatesByAdvisorProject.tsx` | Reorder tabs, fix table columns, rename milestone tab |

---

## Visual Result

### Before:
```
┌──────────────┬──────────────┬──────────────┐
│  שורות שכ"ט  │   שירותים    │   אבני דרך   │  ← Wrong RTL order
└──────────────┴──────────────┴──────────────┘

│ תיאור │ יחידה │ כמות │ סוג חיוב │ סטטוס │ 🗑️ │  ← Actions on wrong side
```

### After:
```
┌──────────────┬──────────────┬──────────────┐
│   שירותים    │  שורות שכ"ט  │    תשלום     │  ← Correct RTL order
└──────────────┴──────────────┴──────────────┘

│ 🗑️ │ תיאור │ יחידה │ כמות │ סוג חיוב │ סטטוס │  ← Actions on right
```

---

## Testing Checklist

1. **Tab Bar**:
   - [ ] שירותים appears on the far right
   - [ ] שורות שכ"ט appears in the middle
   - [ ] תשלום appears on the far left
   - [ ] Default selected tab is שירותים

2. **Tables**:
   - [ ] Action buttons (edit/delete) appear on the right side
   - [ ] Content columns flow right-to-left
   - [ ] All text properly right-aligned

3. **RTL Inheritance**:
   - [ ] Card headers follow RTL (title right, button left)
   - [ ] Empty states are centered

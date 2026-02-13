

## Consolidate Duplicate Status Filters

### Problem
The task management dashboard currently shows two rows of status indicators:
1. **TaskFilters component** — clickable Badge chips (ממתין, בביצוע, חסום, באיחור, הושלם, בוטל) for filtering
2. **Status summary row** — icon + label + count cards (ממתין, בביצוע, באיחור, חסום, הושלם) for display only

These are redundant and take up unnecessary space.

### Solution
Remove the status Badge chips from `TaskFilters` and make the status summary cards clickable (acting as both stats display AND filter toggles). This gives users a single, unified row that shows counts and allows filtering.

### Changes

**File: `src/components/tasks/TaskManagementDashboard.tsx`**
- Make the status summary cards clickable — clicking toggles that status in `filters.statuses`
- Add visual feedback: highlight selected cards (e.g., ring/border) when actively filtering
- Add "cancelled" (בוטל) to the status items list (currently missing from summary but present in filters)
- Remove the separate `<TaskFilters>` component call from the top bar (move advisor filter inline instead)

**File: `src/components/tasks/TaskFilters.tsx`**
- Remove the status Badge chips section entirely
- Keep only the advisor dropdown filter and the "Clear" button
- This component becomes a simple advisor-only filter (or can be inlined into the dashboard)

### Technical Details

In `TaskManagementDashboard.tsx`, the status summary cards (lines 208-219) change from static display to interactive:

```tsx
// Each card becomes clickable, toggling filter
<div
  key={item.key}
  onClick={() => toggleStatus(item.key as TaskStatus)}
  className={cn(
    "flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors",
    filters.statuses.includes(item.key as TaskStatus)
      ? "bg-primary/10 border-primary ring-1 ring-primary/30"
      : "bg-card hover:bg-muted"
  )}
>
  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
  <span className="text-muted-foreground">{item.label}</span>
  <span className="font-semibold">{item.count}</span>
</div>
```

A `toggleStatus` function will be added (same logic as in TaskFilters):
```tsx
const toggleStatus = (status: TaskStatus) => {
  const current = filters.statuses;
  const next = current.includes(status)
    ? current.filter(s => s !== status)
    : [...current, status];
  setFilters(f => ({ ...f, statuses: next }));
};
```

The advisor filter from `TaskFilters` will be moved inline into the top bar alongside the project selector. The "Clear filters" button will also be placed inline.

### Result
- One unified status row: icons + counts + click-to-filter
- Advisor filter stays in the top bar
- Less vertical space used
- Cleaner, more intuitive interface


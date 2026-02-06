

# Plan: Simplify Project Type Cards Display

## Current Behavior

Each project type card shows a badge:
- **"X תבניות"** - when templates exist (template_count > 0)
- **"טרם הוגדר"** - when no templates exist (template_count = 0)

## Analysis

The "טרם הוגדר" badge appears on every card that doesn't have templates yet. In the screenshot, all project types under "אדריכל" show this badge because no templates have been configured.

**Purpose**: To indicate which project types have been configured vs. not.

**Problem**: It adds visual clutter without providing actionable value - the user can click any project type regardless of whether templates exist.

## Proposed Solution

**Option: Show badge only when templates exist**

Only display the template count badge when there are actual templates. Cards with no templates will simply not have a badge, keeping the UI cleaner.

### Visual Result

**Before:**
```
┌─────────────────────────┐
│ 📁 בתי אבות / מוסדות    │
│                 טרם הוגדר │  ← Badge on every empty card
└─────────────────────────┘
```

**After:**
```
┌─────────────────────────┐
│ 📁 בתי אבות / מוסדות    │
│                         │  ← No badge = clean look
└─────────────────────────┘

┌─────────────────────────┐
│ 📁 מגורים בבנייה רוויה  │
│                5 תבניות │  ← Badge only when content exists
└─────────────────────────┘
```

---

## Implementation

**File**: `src/pages/admin/FeeTemplatesByProject.tsx`

**Change**: Lines 94-98

```tsx
// Before
<CardContent>
  <div className="flex items-center justify-end">
    <Badge variant={project.template_count > 0 ? "default" : "secondary"}>
      {project.template_count > 0 ? `${project.template_count} תבניות` : "טרם הוגדר"}
    </Badge>
  </div>
</CardContent>

// After
<CardContent>
  {project.template_count > 0 && (
    <div className="flex items-center justify-end">
      <Badge variant="default">
        {project.template_count} תבניות
      </Badge>
    </div>
  )}
</CardContent>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/FeeTemplatesByProject.tsx` | Remove "טרם הוגדר" badge, show badge only when templates exist |

---

## Testing Checklist

1. Project types with 0 templates show no badge
2. Project types with templates show "X תבניות" badge
3. Cards are still clickable and navigate correctly
4. Sorting still works (projects with templates first)


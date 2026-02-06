
# Plan: Mark and Prioritize Live Project Types in Admin Templates

## Problem

The admin template management page shows all 60+ project types, but only 3 are currently enabled for entrepreneurs (Urban Renewal category). Admins need to:
1. Easily identify which project types are "live" and need templates
2. See these priority types first, not buried in the alphabetical list

## Solution

### Part 1: Define Live Project Types

Add a constant in `src/constants/project.ts` that defines which project types are currently enabled for entrepreneurs:

```typescript
// Project types currently enabled for entrepreneurs to create
export const LIVE_PROJECT_TYPES: ProjectType[] = [
  'פינוי־בינוי (מתחמים)',
  'תמ"א 38/1 – חיזוק ותוספות',
  'תמ"א 38/2 – הריסה ובנייה מחדש',
];

// Helper function to check if a project type is live
export const isLiveProjectType = (type: string): boolean => {
  return LIVE_PROJECT_TYPES.includes(type as ProjectType);
};
```

This keeps the source of truth in one place - when you enable more categories in `ProjectTypeSelector`, you add them here too.

### Part 2: Update Sorting Logic

In `FeeTemplatesByProject.tsx`, update the sorting to prioritize:
1. **First**: Live project types (פעיל)
2. **Second**: Project types with templates (by count, descending)
3. **Third**: Alphabetically

```typescript
import { isLiveProjectType } from "@/constants/project";

const projectTypes = PROJECT_TYPES.map((type) => {
  const summary = summaries?.find((s) => s.project_type === type);
  return {
    project_type: type,
    template_count: summary?.template_count || 0,
    is_live: isLiveProjectType(type),
  };
}).sort((a, b) => {
  // First: Live project types at the top
  if (a.is_live !== b.is_live) {
    return a.is_live ? -1 : 1;
  }
  // Second: By template count (descending)
  if (b.template_count !== a.template_count) {
    return b.template_count - a.template_count;
  }
  // Third: Alphabetically
  return a.project_type.localeCompare(b.project_type, 'he');
});
```

### Part 3: Add Visual Badge

Add a green "פעיל" (Active) badge to live project types:

```tsx
<CardContent>
  <div className="flex items-center justify-between">
    {project.is_live && (
      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
        פעיל
      </Badge>
    )}
    {project.template_count > 0 && (
      <Badge variant="default">
        {project.template_count} תבניות
      </Badge>
    )}
  </div>
</CardContent>
```

### Visual Result

```text
┌─────────────────────────────────────┐
│ 📁 פינוי־בינוי (מתחמים)             │
│ פעיל                      5 תבניות │  ← Live + has templates
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 📁 תמ"א 38/1 – חיזוק ותוספות        │
│ פעיל                                │  ← Live, no templates yet
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 📁 תמ"א 38/2 – הריסה ובנייה מחדש    │
│ פעיל                                │  ← Live, no templates yet
└─────────────────────────────────────┘
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
┌─────────────────────────────────────┐
│ 📁 בתי אבות / מוסדות סיעודיים       │
│                                     │  ← Not live, no badge
└─────────────────────────────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/constants/project.ts` | Add `LIVE_PROJECT_TYPES` constant and `isLiveProjectType()` helper |
| `src/pages/admin/FeeTemplatesByProject.tsx` | Update sorting logic, add "פעיל" badge for live types |

---

## Future-Proofing

When you enable more categories for entrepreneurs:
1. Add the new project types to `LIVE_PROJECT_TYPES` array
2. Update the `isEnabled` check in `ProjectTypeSelector` (same category logic)

Both places stay in sync through the shared constants file.

---

## Testing Checklist

1. The 3 Urban Renewal types appear first in the grid
2. Each of the 3 shows a green "פעיל" badge
3. Template count badges still display correctly alongside "פעיל"
4. Non-live project types don't show the "פעיל" badge
5. Clicking any card still navigates correctly

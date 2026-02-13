

## Plan: Dashboard Default View and Task Template Loading Architecture

### Change 1: Swap Default Tab to "My Projects" and Reorder Tabs

Currently in `src/pages/Dashboard.tsx` (line 378), the default tab is `"tasks"` and the tab order is: "ניהול משימות" (left) then "הפרויקטים שלי" (right).

**What changes:**
- Change `defaultValue="tasks"` to `defaultValue="projects"` (line 378)
- Swap the two `TabsTrigger` elements so "הפרויקטים שלי" appears on the right (first in RTL) and "ניהול משימות" appears on the left (second in RTL)

This is a 3-line change in a single file.

---

### Change 2: Confirm Task Template Auto-Loading Architecture (Already Implemented)

The objective you described -- admin defines default tasks per combination of **project type + project stage + municipality**, and those tasks are loaded for the entrepreneur as the project progresses -- is already implemented:

- **Admin side**: `task_templates` table stores templates with `project_type`, `licensing_phase_id` (stage), and `municipality_id` fields. Admin manages these via the Task Templates Management page.
- **Entrepreneur side**: `useAutoTaskLoader.ts` already:
  1. Fetches the project's `municipality_id`
  2. Queries templates matching `project_type` + `municipality_id` (with fallback to generic)
  3. Filters templates by the current `project_phase` (only loads tasks from the current phase onward)
  4. Applies user personalizations on top

**No code changes needed** for this part -- the architecture matches the objective. The key is ensuring the admin populates the `task_templates` table with the correct combinations.

---

### Technical Details

**File:** `src/pages/Dashboard.tsx`

Lines 378-393 change from:
```
<Tabs defaultValue="tasks" ...>
  <TabsTrigger value="tasks">ניהול משימות</TabsTrigger>
  <TabsTrigger value="projects">הפרויקטים שלי</TabsTrigger>
```

To:
```
<Tabs defaultValue="projects" ...>
  <TabsTrigger value="projects">הפרויקטים שלי</TabsTrigger>
  <TabsTrigger value="tasks">ניהול משימות</TabsTrigger>
```


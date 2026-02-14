

# Fix: Add "Load from Templates" Button and Support Per-Stage Template Loading

## Problems Identified

1. **No templates in database**: The `task_templates` table is empty, so the `AutoTaskSuggestionBanner` never shows (it requires `templates.length > 0`).
2. **No explicit button**: There is no "Load from Templates" button in the toolbar -- the only mechanism is a banner that auto-appears when there are zero tasks.
3. **No per-stage loading**: Once a project has tasks, there is no way to load additional templates for the current or next licensing stage.

## Solution

### 1. Add a "Load from Templates" button to the TaskBoard toolbar

Add a button (e.g., "טען מתבניות" with a `Download` or `Sparkles` icon) next to the existing "הוספת משימה" button in the TaskBoard header. This button is always visible, regardless of whether tasks already exist.

### 2. Create a `LoadTaskTemplatesDialog` component

A dialog that:
- Fetches available templates using `useTemplateResolver` (already exists), filtered by the project's `projectType`, `municipalityId`, and optionally by licensing phase/stage
- Shows templates grouped by licensing phase
- Allows the user to select which phase's templates to load (or select all)
- Shows a preview of templates with checkboxes (name, duration, specialty)
- Has a "Load Selected" button that calls `useBulkTaskCreation.createTasksFromTemplates()`
- Skips templates that already have corresponding tasks (by `template_id`) to avoid duplicates

### 3. Keep the AutoTaskSuggestionBanner for the empty state

The banner remains as a convenience for brand-new projects, but the button provides full control at any stage.

## Files to Create/Edit

| File | Action | Description |
|---|---|---|
| `src/components/tasks/LoadTaskTemplatesDialog.tsx` | NEW | Dialog to browse and selectively load templates by stage |
| `src/components/tasks/TaskBoard.tsx` | EDIT | Add "Load from Templates" button to toolbar that opens the dialog |
| `src/components/tasks/index.ts` | EDIT | Export the new dialog |

## Technical Details

### LoadTaskTemplatesDialog

```text
+------------------------------------------+
| Load Task Templates            [X close] |
|------------------------------------------|
| Project Type: מגורים בבנייה רוויה        |
| Municipality: (none / Tel Aviv)          |
|------------------------------------------|
| Phase: בדיקה ראשונית                     |
|   [x] Template 1 (14 days, architect)    |
|   [x] Template 2 (7 days, engineer)      |
|   [ ] Template 3 (already loaded)        |
|------------------------------------------|
| Phase: תכנון ראשוני                      |
|   [x] Template 4 (21 days)               |
|------------------------------------------|
| [Select All]    [Load Selected (3)]      |
+------------------------------------------+
```

Key logic:
- Query `task_templates` filtered by `project_type` and `municipality_id` (with fallback, using existing `useTemplateResolver` pattern)
- Cross-reference with existing `project_tasks` by `template_id` to mark already-loaded templates as disabled
- Group results by `licensing_phases.name` for clear stage-based selection
- On submit, call `createTasksFromTemplates` with only the selected templates
- After success, trigger `refetch` to update the board

### TaskBoard toolbar change

```text
Before: [Table] [Kanban]  [+ הוספת משימה]
After:  [Table] [Kanban]  [טען מתבניות]  [+ הוספת משימה]
```

The "Load from Templates" button opens `LoadTaskTemplatesDialog`. It passes `projectId`, `projectType`, `projectPhase`, and the current task list (for duplicate detection).

### Duplicate prevention

When loading templates, filter out any template whose `id` already matches an existing task's `template_id` in the project. These appear greyed out in the dialog with a note "already loaded".



# Fix Stage Navigation and Task Loading

## Problems Identified

1. **Tasks created with wrong/null `phase` field**: When tasks are created from templates, the code uses `template.phase` (a rarely-populated free-text field) instead of the licensing phase name (`template.licensing_phases?.name`). This means tasks don't get tagged with the correct stage name, so filtering by stage doesn't work.

2. **No "Previous Stage" button**: The toolbar only has a "Next Stage" button -- users can't navigate backward.

3. **Phase filter doesn't auto-select**: When changing stages, the phase filter pills don't auto-select the new stage, so users see all tasks mixed together instead of the new stage's tasks.

## Changes

### 1. `useBulkTaskCreation.ts` -- Fix phase assignment

Set the task's `phase` field to the licensing phase name from the joined relation, falling back to `template.phase`:

```
phase: template.licensing_phases?.name || template.phase || null,
```

This ensures every task created from a template gets the correct stage name (e.g., "בדיקה ראשונית", "תכנון ראשוני").

### 2. `TaskBoard.tsx` -- Add bidirectional stage navigation

- Add a "Previous Stage" button alongside the existing "Next Stage" button
- Use `PROJECT_PHASES` to calculate both directions
- Auto-set the phase filter to the current project phase when it changes, so users immediately see tasks for the active stage

### 3. `TaskBoard.tsx` -- Auto-filter to current phase on stage change

When `projectPhase` changes, automatically set `phaseFilter` to the new phase so the board shows the relevant tasks immediately. Add a `useEffect` that watches `projectPhase`.

### 4. `LoadTaskTemplatesDialog.tsx` -- Set phase on created tasks

Pass `currentPhase` through to the bulk creation so newly loaded tasks get the correct phase tag. Update the dialog to pass the phase name to `createTasksFromTemplates`.

## Technical Summary

| File | Change |
|---|---|
| `src/hooks/useBulkTaskCreation.ts` | Use `template.licensing_phases?.name` for `phase` field |
| `src/components/tasks/TaskBoard.tsx` | Add previous stage button, auto-filter to current phase |
| `src/components/tasks/LoadTaskTemplatesDialog.tsx` | Pass phase override to bulk creation |
| `src/components/tasks/StageTaskLoadDialog.tsx` | Pass phase name override to bulk creation |

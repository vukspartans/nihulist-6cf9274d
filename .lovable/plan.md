
# Add "Next Stage" Button and Fix Duplicate Prevention

## Problem
1. The phase selector is at the top of the page, far from the Tasks tab -- users can't easily advance stages while working on tasks
2. `existingTemplateIds` is passed as `new Set()` in `ProjectDetail.tsx`, so both `StageTaskLoadDialog` and duplicate detection never work
3. Test task data from previous loads needs to be cleared

## Changes

### 1. TaskBoard.tsx -- Add "Next Stage" button + fix existingTemplateIds propagation

- Add a prominent "שלב הבא" (Next Stage) button in the task toolbar (next to "Load from templates" and "Add task")
- Import `PROJECT_PHASES` to calculate the next phase
- Accept a new `onPhaseChange` callback prop from `ProjectDetail`
- When clicked, call `onPhaseChange(nextPhase)` which triggers the phase update + `StageTaskLoadDialog` in ProjectDetail
- Disable the button when on the last phase ("הסתיים")
- Show current phase name on the button for context

### 2. ProjectDetail.tsx -- Fix existingTemplateIds for StageTaskLoadDialog

- Before rendering `StageTaskLoadDialog`, fetch existing `template_id` values from `project_tasks` for the current project
- Store them in state and pass to the dialog
- Pass `handlePhaseChange` down to `TaskBoard` as `onPhaseChange` prop
- Add a state variable to hold `existingTemplateIds` fetched from the database

### 3. StageTaskLoadDialog.tsx -- Self-fetch existing template IDs

- Instead of relying on props for `existingTemplateIds`, have the dialog fetch them directly from `project_tasks` when it opens
- This makes it self-contained and always accurate
- Remove the `existingTemplateIds` prop requirement

### 4. Clear test data

- Delete all rows from `project_tasks` for the test project (aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004) so the flow can be tested fresh

## Technical Details

**Next Stage button logic:**
```text
Current phase index = PROJECT_PHASES.indexOf(projectPhase)
Next phase = PROJECT_PHASES[currentIndex + 1]
Button disabled if currentIndex === PROJECT_PHASES.length - 1
```

**Self-fetching existingTemplateIds in StageTaskLoadDialog:**
```text
const { data } = await supabase
  .from('project_tasks')
  .select('template_id')
  .eq('project_id', projectId)
  .not('template_id', 'is', null);
const existingIds = new Set(data.map(d => d.template_id));
```

This removes the broken pattern of passing `new Set()` and makes both dialogs always accurate.

## Files to Edit

| File | Change |
|---|---|
| `src/components/tasks/TaskBoard.tsx` | Add "Next Stage" button, accept `onPhaseChange` prop |
| `src/pages/ProjectDetail.tsx` | Pass `handlePhaseChange` to TaskBoard, remove broken `new Set()` |
| `src/components/tasks/StageTaskLoadDialog.tsx` | Self-fetch existingTemplateIds instead of relying on prop |
| `src/components/tasks/LoadTaskTemplatesDialog.tsx` | Self-fetch existingTemplateIds instead of relying on prop |

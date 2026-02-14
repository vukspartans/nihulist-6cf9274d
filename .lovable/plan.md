

# Stage-Based Task Loading: Auto-Load Tasks When Project Phase Changes

## Overview

Transform the task management system so that each project stage (phase) has its own collection of tasks. When an entrepreneur advances the project to a new stage, the system automatically loads the relevant templates for that stage.

## Current Problem

- The phase selector in ProjectDetail updates the `phase` field but does nothing with tasks
- `LoadTaskTemplatesDialog` loads ALL templates from ALL stages at once
- There is no connection between "changing a stage" and "getting new tasks"

## What Changes

### 1. Phase Change Triggers Task Loading

When the entrepreneur selects a new phase from the dropdown (e.g., moves from "בדיקה ראשונית" to "תכנון ראשוני"), the system will:
1. Update the project's phase in the database (already works)
2. Check if there are task templates linked to the NEW phase via `licensing_phase_id`
3. Filter out templates already loaded (by `template_id`)
4. If new templates are found, show a confirmation dialog asking "Load X tasks for stage Y?"
5. On confirmation, create the tasks using existing `useBulkTaskCreation`

### 2. Enhanced Phase Change Flow in ProjectDetail

```text
Entrepreneur clicks phase selector
  --> Selects new phase (e.g., "תכנון ראשוני")
  --> System updates project.phase
  --> System queries task_templates WHERE licensing_phase matches the new phase
  --> Filters out already-loaded templates
  --> If templates found:
       Shows dialog: "Found 3 tasks for stage תכנון ראשוני. Load them?"
       [Load Tasks]  [Skip]
  --> Tasks created with planned dates starting from today
```

### 3. Visual Grouping of Tasks by Stage

Update `TaskBoard` and `ProjectTaskView` to group/filter tasks by their originating phase, so entrepreneurs can see which tasks belong to each stage.

## Files to Create/Edit

| File | Action | Description |
|---|---|---|
| `src/components/tasks/StageTaskLoadDialog.tsx` | NEW | Lightweight confirmation dialog shown after phase change, listing templates for the new stage |
| `src/pages/ProjectDetail.tsx` | EDIT | Enhance `handlePhaseChange` to trigger template loading after phase update |
| `src/components/tasks/TaskBoard.tsx` | EDIT | Add phase grouping/filter toggle so tasks can be viewed per-stage |
| `src/components/tasks/LoadTaskTemplatesDialog.tsx` | EDIT | Add optional `filterPhase` prop to pre-filter templates by a specific licensing phase |

## Technical Details

### StageTaskLoadDialog

A simple dialog that:
- Receives the new phase name and project metadata
- Queries `task_templates` joined with `licensing_phases` where the phase name matches the new project phase
- Cross-references existing project tasks by `template_id` to skip duplicates
- Shows a list of templates to be loaded with a "Load" or "Skip" action
- Calls `useBulkTaskCreation.createTasksFromTemplates()` on confirm

### ProjectDetail.tsx - handlePhaseChange Enhancement

After updating the phase in the database, the function will:
1. Look up the `licensing_phases` record matching the new phase name and project type
2. If found, set state to open `StageTaskLoadDialog` with the phase details
3. The dialog handles the rest (template fetching, loading)

### Mapping Between PROJECT_PHASES and licensing_phases

`PROJECT_PHASES` has 13 stages (e.g., "בדיקה ראשונית", "תכנון ראשוני", etc.). The `licensing_phases` table has 4 records for "מגורים" with matching names. The system will match by name -- when the entrepreneur selects phase "תכנון ראשוני", the system looks up `licensing_phases` WHERE `name = 'תכנון ראשוני'` AND `project_type = project.type`.

Phases without matching `licensing_phases` records simply won't trigger any task loading (graceful no-op).

### TaskBoard Phase Filter

Add a small phase filter pill/selector at the top of the task board so the entrepreneur can view "all tasks" or filter by a specific stage. Each task will carry its `phase` field (set from the template's licensing phase name during creation).


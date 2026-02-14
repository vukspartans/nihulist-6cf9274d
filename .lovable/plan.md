
# Add Auto-Task Template Loading to Project Detail Task Board

## Problem
The `TaskBoard` component (rendered inside `ProjectDetail.tsx`) shows a plain empty state ("No tasks yet, add first task") when a project has no tasks. It does NOT show the `AutoTaskSuggestionBanner` that would offer to auto-load tasks from admin-configured templates.

The `AutoTaskSuggestionBanner` currently only appears in the standalone `TaskManagementDashboard` -- not in the per-project Task Board.

## Solution

### 1. Update `TaskBoard.tsx` to accept project metadata props

Add optional `projectType` and `projectPhase` props so the banner knows which templates to suggest:

```typescript
interface TaskBoardProps {
  projectId: string;
  projectType?: string | null;
  projectPhase?: string | null;
}
```

### 2. Add `AutoTaskSuggestionBanner` to the empty state in `TaskBoard.tsx`

When `tasks.length === 0` and `projectType` is available, render the `AutoTaskSuggestionBanner` above the existing "Add first task" button. On successful load, trigger a refetch of tasks.

### 3. Pass project data from `ProjectDetail.tsx`

Update the `<TaskBoard>` call in `ProjectDetail.tsx` to pass the project's type and phase:

```tsx
<TaskBoard 
  projectId={project.id} 
  projectType={project.project_type} 
  projectPhase={project.phase} 
/>
```

## Files to Edit

| File | Change |
|---|---|
| `src/components/tasks/TaskBoard.tsx` | Add `projectType`/`projectPhase` props; import and render `AutoTaskSuggestionBanner` in empty state; trigger refetch on load |
| `src/pages/ProjectDetail.tsx` | Pass `projectType` and `projectPhase` to `TaskBoard` |

## Technical Details

- The `AutoTaskSuggestionBanner` internally uses `useAutoTaskLoader`, which queries `task_templates` filtered by project type, municipality, and licensing phase
- It calls `useBulkTaskCreation.createTasksFromTemplates()` to insert the tasks
- After loading, the `onTasksCreated` callback triggers a refetch so the board re-renders with the new tasks
- The banner includes a dismiss button so users can skip the suggestion

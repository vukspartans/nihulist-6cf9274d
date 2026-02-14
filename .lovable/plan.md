

# Fix: Tasks Not Refreshing After Stage Change

## Problem

When the user clicks "Next Stage" (e.g., moving to "פרסום"), the `StageTaskLoadDialog` opens and creates 2 new tasks successfully (toast confirms it). However, the task table still shows only the original 3 tasks from "בדיקה ראשונית" because:

1. **Empty callback**: In `ProjectDetail.tsx` (line 577), the `onTasksCreated` callback passed to `StageTaskLoadDialog` is empty -- it does nothing:
   ```
   onTasksCreated={() => {
     // TaskBoard will refetch via its own hook
   }}
   ```
   But the TaskBoard does NOT automatically refetch because there is no real-time subscription or shared state.

2. **No shared refetch**: The `TaskBoard` component has its own `refetch` function from `useProjectTasks`, but `ProjectDetail.tsx` has no way to trigger it.

## Solution

Pass a ref or callback from `TaskBoard` up to `ProjectDetail` so that the `StageTaskLoadDialog` can trigger a task refetch. The simplest approach:

### Option: Lift refetch via a callback ref

1. **`TaskBoard.tsx`**: Accept an optional `onRefetchReady` prop that exposes the internal `refetch` function to the parent.

2. **`ProjectDetail.tsx`**: 
   - Store the refetch function in a `useRef`
   - Pass it to `TaskBoard` via `onRefetchReady`
   - Call it inside `StageTaskLoadDialog`'s `onTasksCreated`

## Files to Change

| File | Change |
|---|---|
| `src/components/tasks/TaskBoard.tsx` | Add `onRefetchReady` prop; call it with `refetch` on mount |
| `src/pages/ProjectDetail.tsx` | Store refetch ref; wire it to `StageTaskLoadDialog.onTasksCreated` |

## Technical Details

**TaskBoard.tsx:**
- Add prop: `onRefetchReady?: (refetch: () => void) => void`
- In a `useEffect`, call `onRefetchReady?.(refetch)` so the parent gets the function

**ProjectDetail.tsx:**
- Add: `const taskRefetchRef = useRef<(() => void) | null>(null)`
- Pass to TaskBoard: `onRefetchReady={(fn) => { taskRefetchRef.current = fn }}`
- Update StageTaskLoadDialog's callback: `onTasksCreated={() => { taskRefetchRef.current?.() }}`

This is a minimal 2-file change that directly solves the refresh issue.

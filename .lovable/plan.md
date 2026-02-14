
# Auto-Filter Tasks to Current Stage on Phase Change

## Problem
After advancing to a new stage, the task board shows all 19 tasks from every stage instead of filtering to the current one. The user expects to see only tasks relevant to the active stage.

## Solution
When `projectPhase` changes (e.g., after a stage advance), automatically set the `phaseFilter` state to match the new phase. The user can still click "הכל" to see everything.

## Changes

**`src/components/tasks/TaskBoard.tsx`** (single change):
- Replace the comment on line 96 (`// No auto-filter...`) with a `useEffect` that sets `phaseFilter` to `projectPhase` whenever `projectPhase` changes:
  ```
  useEffect(() => {
    if (projectPhase) {
      setPhaseFilter(projectPhase);
    }
  }, [projectPhase]);
  ```
- This ensures the board immediately focuses on the current stage's tasks after a phase advance, while still allowing manual filter changes via the phase badges.



# Fix: Load Only Current Stage Tasks from Templates

## Problem

The "Load from templates" dialog currently shows tasks from ALL licensing phases (Initial inspection, Initial planning, Submitting a permit application, etc.). It should only show tasks for the **current project stage**.

## Solution

Add a `currentPhase` prop to `LoadTaskTemplatesDialog` and filter the fetched templates to only include those whose `licensing_phase` name matches the current project phase.

## Changes

### 1. `LoadTaskTemplatesDialog.tsx` -- Add phase filtering

- Add a new optional prop: `currentPhase?: string | null`
- In `fetchTemplates()`, after fetching templates, filter results to only include templates where `licensing_phases.name === currentPhase`
- If `currentPhase` is null/undefined, fall back to showing all (backward compatible)
- Update the dialog description to mention the current phase name

### 2. `TaskBoard.tsx` -- Pass `projectPhase` to the dialog

- Pass the existing `projectPhase` prop through to `LoadTaskTemplatesDialog` as `currentPhase`
- The `TaskBoard` already receives `projectPhase` in its props but doesn't forward it

## Technical Detail

In `fetchTemplates()`, after each query returns data, add a filter:

```typescript
if (currentPhase) {
  data = data.filter(t => t.licensing_phases?.name === currentPhase);
}
```

This uses the already-joined `licensing_phases` relation to match by name, consistent with how `StageTaskLoadDialog` works.


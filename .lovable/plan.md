
# Skip Stage Task Dialog When No New Tasks

## Problem
When advancing to a stage where all task templates are already loaded, the dialog still opens showing 0 new tasks with a "Load (2) tasks" button. This is confusing -- if there's nothing new to load, the dialog shouldn't appear at all.

## Solution
After fetching templates and existing task IDs, check if there are any genuinely new templates (not already in `existingTemplateIds`). If every template is already loaded, silently close the dialog instead of showing it.

## Change (1 file)

**`src/components/tasks/StageTaskLoadDialog.tsx`** -- after line 93 (inside `fetchTemplatesForPhase`, after setting templates and selected IDs):

Add a check: if every fetched template is already loaded, auto-close the dialog:
```typescript
// If all templates are already loaded, skip the dialog
const hasNewTemplates = results.some(t => !fetchedIds.has(t.id));
if (!hasNewTemplates) {
  onOpenChange(false);
  return;
}
```

This runs before `setLoading(false)`, so the user never sees a flash of empty content. The dialog simply won't appear when there's nothing new to load.

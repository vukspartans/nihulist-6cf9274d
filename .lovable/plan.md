
# Fix Stage Task Loading Dialog

## Problem
The recent "skip dialog when no new tasks" change is preventing the dialog from appearing when it should. The auto-close check runs before the user ever sees the dialog, so switching phases appears to do nothing.

## Root Cause
The `hasNewTemplates` check on line 91 of `StageTaskLoadDialog.tsx` compares fetched templates against ALL existing project tasks (across all phases). If the user previously loaded templates for a phase and then switches back or to a new phase where templates overlap, the dialog auto-closes immediately.

Additionally, the dialog shows ALL templates (including already-loaded ones) but the submit logic silently filters them out, creating confusion about what will actually be created.

## Solution
Instead of auto-closing the dialog, filter the template list to show ONLY genuinely new templates. If none remain after filtering, then skip the dialog silently.

## Changes (1 file)

**`src/components/tasks/StageTaskLoadDialog.tsx`**:

1. After fetching results, filter to only new templates: `const newTemplates = results.filter(t => !fetchedIds.has(t.id))`
2. Use `newTemplates` (not `results`) for `setTemplates` and `setSelectedIds`
3. Keep the auto-close but check `newTemplates.length === 0` instead of the current `hasNewTemplates` logic
4. Remove the `existingTemplateIds` state entirely since it's no longer needed -- already-loaded templates won't be in the list at all
5. Remove the filtering in `handleSubmit` since all displayed templates are new
6. Clean up UI: remove the "already loaded" badge since those templates won't appear
7. Fix the `selectableCount` / button count to simply use `selectedIds.size`

This way:
- The dialog shows only what's actionable (new tasks for this stage)
- If there's nothing new, the dialog doesn't appear
- The entrepreneur can select/deselect freely among new tasks
- No confusion about disabled items or misleading counts

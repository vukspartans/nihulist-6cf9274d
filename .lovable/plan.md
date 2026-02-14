
# Enable Task Selection for Already-Loaded Templates

## Problem
In the `StageTaskLoadDialog`, templates that were already loaded into the project are shown as checked and disabled (greyed out). The entrepreneur cannot uncheck them or interact with them. The user wants full control over which tasks to load for the current stage.

## Solution
Remove the "disabled" behavior for already-loaded templates. All templates should be selectable checkboxes. The "already loaded" badge can remain as an informational indicator, but the checkbox should be fully interactive.

## Changes (1 file)

**`src/components/tasks/StageTaskLoadDialog.tsx`**:

1. **Line 113**: Remove the early return guard `if (existingTemplateIds.has(id)) return;` from `toggleTemplate` so all checkboxes are toggleable.

2. **Lines 88-97**: Change pre-selection logic -- currently only pre-selects new templates. Instead, pre-select ALL templates (both new and existing) so the user starts with everything checked and can uncheck what they don't want.

3. **Lines 154-155**: Remove `disabled={alreadyLoaded}` from the Checkbox and remove `opacity-50 cursor-not-allowed` from the label styling so already-loaded items look fully interactive.

4. **Lines 120-126**: In `handleSubmit`, filter out templates that are already loaded (from `existingTemplateIds`) before creating tasks, so we only create genuinely new ones -- avoiding duplicates while letting the user see the full picture.

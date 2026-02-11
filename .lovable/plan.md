

# Remove Standalone Milestone Templates Page

## Context

Milestone templates are already managed inside each fee template category via the `CategoryMilestonesTab` component (within the template hierarchy). The standalone "תבניות אבני דרך" page at `/heyadmin/milestone-templates` is redundant and should be removed.

## Changes

### 1. Remove the route from App.tsx
- Delete the import of `MilestoneTemplatesManagement`
- Delete the route `/heyadmin/milestone-templates`

### 2. Remove the sidebar nav item from AdminLayout.tsx
- Remove the entry for `milestone-templates` from the payment nav items array
- Remove the `milestone-templates` check from the `isPaymentRoute` condition

### 3. Remove navigation links from RFPTemplatesManagement.tsx
- Remove the two `Link` buttons that navigate to `/heyadmin/milestone-templates` ("ניהול אבני דרך" and "צור אבני דרך")

### 4. Delete the page file
- Delete `src/pages/admin/MilestoneTemplatesManagement.tsx`

### What stays
- `useMilestoneTemplates.ts` hook -- still used by `CategoryMilestonesTab` and other components
- `CategoryMilestonesTab.tsx` -- the in-template milestone management UI
- `CreateMilestoneTemplateDialog.tsx` and `EditMilestoneTemplateDialog.tsx` -- used by `CategoryMilestonesTab`
- `MilestonePercentageSummary.tsx` and `MilestoneTaskLinker.tsx` -- used within the template hierarchy


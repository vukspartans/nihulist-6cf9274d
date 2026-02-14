

# Add "Critical for Payment" Toggle to Task Forms

## Overview
Add a toggle switch to both the **TaskDetailDialog** (edit) and **CreateTaskDialog** (create) so users can manually mark tasks as payment-critical. This flag controls whether a task blocks invoice submission for its linked milestone.

## Changes

### 1. TaskDetailDialog.tsx (Edit Form)
- Add `is_payment_critical` to the `formData` state initialization (line ~90, alongside `is_milestone`)
- Add a Switch toggle next to the existing "אבן דרך" (Milestone) checkbox in the Progress section (around line 393-402)
- Label: **"קריטי לתשלום"** with an orange indicator style
- Include a small helper text explaining the impact: "משימה זו חוסמת הגשת חשבון עבור אבן הדרך המקושרת"
- Pass `is_payment_critical` through to `onSubmit`

### 2. CreateTaskDialog.tsx (Create Form)  
- Add `is_payment_critical: false` to the initial `formData` state
- Add a Switch toggle below the existing "סמן כאבן דרך" checkbox (line ~175-184)
- Include `is_payment_critical` in the submitted data
- Reset it on form clear

### 3. useProjectTasks.ts (Hook)
- Add `is_payment_critical` to the `createTask` insert payload (currently missing)
- Add `is_payment_critical` to the `updateTask` update payload (currently missing)

## Technical Details

- **Component**: Use the existing `Switch` component (`@/components/ui/switch`) with `dir="ltr"` per RTL standards
- **Styling**: Orange-themed indicator consistent with the existing badge in the dialog header
- **Data integrity**: The `handleTaskSubmit` in `TaskManagementDashboard` filters undefined fields, so adding the field to the hook is safe
- **No migration needed**: The `is_payment_critical` column already exists in `project_tasks`

## Visual Layout (in TaskDetailDialog)
The toggle will appear in the Progress/Milestone section:

```text
+-------------------------------------------+
| התקדמות                           45%     |
| [=========>-----------]                    |
|-------------------------------------------|
| [x] אבן דרך    |  [toggle] קריטי לתשלום  |
+-------------------------------------------+
```


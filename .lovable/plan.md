
# Add Alpha Banners to Entrepreneur-Side Features

## What
Add the same amber "Alpha" banner used on the Advisor Dashboard to the entrepreneur-side features that are still in development: **Task Management** and **Financial Center (Accountant Dashboard)**.

## Where to Add

### 1. Entrepreneur Dashboard - Tasks Tab (`src/pages/Dashboard.tsx`)
Add the alpha banner above `<TaskManagementDashboard />` (line 399), identical to the advisor version.

### 2. Project Detail - Tasks Tab (`src/pages/ProjectDetail.tsx`)
Add the alpha banner above `<TaskBoard ... />` (line 560).

### 3. Project Detail - Payments Tab (`src/pages/ProjectDetail.tsx`)
Add the alpha banner above `<PaymentDashboard ... />` (line 564).

### 4. Accountant Dashboard (`src/pages/AccountantDashboard.tsx`)
Add the alpha banner near the top of the page content.

## Banner Code (exact match to advisor)

```tsx
import { FlaskConical } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

<Alert variant="warning" className="mb-4 border-amber-300 bg-amber-50">
  <FlaskConical className="h-4 w-4" />
  <AlertDescription>פיצ'ר זה נמצא בגרסת אלפא — ייתכנו שינויים ושיפורים</AlertDescription>
</Alert>
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add alpha banner above `TaskManagementDashboard` in the tasks tab |
| `src/pages/ProjectDetail.tsx` | Add alpha banner above `TaskBoard` and above `PaymentDashboard` |
| `src/pages/AccountantDashboard.tsx` | Add alpha banner at the top of the page content |

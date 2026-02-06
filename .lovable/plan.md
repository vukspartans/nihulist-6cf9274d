

# Plan: Consolidate and Rename Template Management Pages

## Summary

Rename `תבניות שכר טרחה` to `תבניות קריאה להצעה` and remove the duplicate `תבניות בקשה` menu item. The hierarchical structure is already correctly implemented.

## Current State Analysis

| Menu Item | Route | Page | Status |
|-----------|-------|------|--------|
| תבניות בקשה | `/heyadmin/rfp-templates` | `RFPTemplatesManagement.tsx` | **Remove** (old flat view) |
| תבניות שכר טרחה | `/heyadmin/fee-templates` | `FeeTemplatesHierarchy.tsx` | **Keep & Rename** |

The hierarchical fee templates system is correctly structured:
```text
Level 1: סוג יועץ (Advisor Type)
    └── Level 2: סוג פרויקט (Project Type) 
        └── Level 3: קטגוריות תבניות (Categories: רישוי, תב"ע, etc.)
            └── Level 4: שיטות הגשה (Submission Methods: פאושלי, כמותי, שעתי)
                ├── שורות סעיפים (Fee Items)
                ├── שירותים (Services) 
                └── אבני דרך (Milestones)
```

---

## Implementation

### 1. Update Admin Menu (`AdminLayout.tsx`)

**Remove** the old `תבניות בקשה` entry and **rename** `תבניות שכר טרחה`:

```typescript
// Before (lines 66-67):
{ title: adminTranslations.navigation.rfpTemplates, url: "/heyadmin/rfp-templates", icon: FileStack },
{ title: "תבניות שכר טרחה", url: "/heyadmin/fee-templates", icon: Wallet },

// After:
{ title: "תבניות קריאה להצעה", url: "/heyadmin/fee-templates", icon: FileStack },
```

### 2. Update Translation Constants (`adminTranslations.ts`)

Update `rfpTemplates` key for consistency (optional, since we're using hardcoded string now):

```typescript
navigation: {
  // ...
  rfpTemplates: "תבניות קריאה להצעה",  // Updated name
}
```

### 3. Update Page Titles

**File: `FeeTemplatesHierarchy.tsx`** (line 34-35):
```tsx
// Before:
<h1>ניהול תבניות שכר טרחה</h1>

// After:
<h1>ניהול תבניות קריאה להצעה</h1>
```

**File: `FeeTemplatesByProject.tsx`** (line 51-56):
- Update subtitle for clarity

**File: `FeeTemplateCategories.tsx`** (lines 93-98):
- Keep current titles (they're already generic)

**File: `FeeTemplateSubmissionMethods.tsx`** (lines 139-141):
- Keep current titles

### 4. Route Cleanup (Optional)

The old route `/heyadmin/rfp-templates` can be kept for backwards compatibility or removed:

**Option A: Remove entirely** (in `App.tsx`):
```tsx
// Remove this line:
<Route path="/heyadmin/rfp-templates" element={<AdminRoute><RFPTemplatesManagement /></AdminRoute>} />
```

**Option B: Redirect to new route** (preserve old links):
```tsx
<Route path="/heyadmin/rfp-templates" element={<Navigate to="/heyadmin/fee-templates" replace />} />
```

I recommend **Option A** since this is internal admin navigation.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/AdminLayout.tsx` | Remove old menu item, rename remaining one |
| `src/constants/adminTranslations.ts` | Update translation key |
| `src/pages/admin/FeeTemplatesHierarchy.tsx` | Update page title |
| `src/App.tsx` | Remove old route (optional) |

---

## Visual Changes

### Before (Admin Menu):
```
📋 ניהול
  ├── יזמים
  ├── יועצים
  ├── פרויקטים
  ├── קריאות להצעות מחיר
  ├── תבניות בקשה          ← REMOVE
  ├── תבניות שכר טרחה       ← RENAME
  ├── משתמשים
  └── ...
```

### After (Admin Menu):
```
📋 ניהול
  ├── יזמים
  ├── יועצים
  ├── פרויקטים
  ├── קריאות להצעות מחיר
  ├── תבניות קריאה להצעה   ← Consolidated & renamed
  ├── משתמשים
  └── ...
```

---

## Project Type Display Enhancement

As requested, project types with existing templates should appear first. This requires updating `FeeTemplatesByProject.tsx`:

```typescript
// Sort project types: those with categories first, then by name
const sortedProjectTypes = projectTypes.sort((a, b) => {
  // First by category count (descending)
  if (b.category_count !== a.category_count) {
    return b.category_count - a.category_count;
  }
  // Then alphabetically by name
  return a.project_type.localeCompare(b.project_type, 'he');
});
```

Also add a visual indicator:
```tsx
<Badge variant={project.category_count > 0 ? "default" : "secondary"}>
  {project.category_count > 0 ? "פעיל" : "טרם הוגדר"}
</Badge>
```

---

## Testing Checklist

1. Navigate to `/heyadmin` and verify:
   - [ ] Only ONE templates menu item appears: `תבניות קריאה להצעה`
   - [ ] Old `תבניות בקשה` is gone
   
2. Click `תבניות קריאה להצעה`:
   - [ ] Shows advisor type grid
   - [ ] Title reads `ניהול תבניות קריאה להצעה`

3. Navigate through hierarchy:
   - [ ] Advisor → Project Type (sorted by activity)
   - [ ] Project Type → Categories
   - [ ] Category → Submission Methods with 3 tabs (שורות סעיפים, שירותים, אבני דרך)

4. Test old route:
   - [ ] `/heyadmin/rfp-templates` returns 404 or redirects (based on chosen option)


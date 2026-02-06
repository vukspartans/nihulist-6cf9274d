

# Plan: Consistent "טען תבנית" (Load Template) Button Across All Tabs

## Current State Analysis

### Existing Template Loading Implementations

| Tab | Current Implementation | Button Style |
|-----|------------------------|--------------|
| **רשימת שירותים** (Services) | Auto-loads via dropdown selection + category hierarchy | No explicit button, uses dropdowns |
| **שכר טרחה** (Fees) | `טען תבנית` button with `FileDown` icon | `variant="secondary"`, inconsistent style |
| **תשלום** (Payment) | `טען תבנית` button with `Database` icon | `variant="ghost"`, small size, different design |

**Problems:**
1. No visual consistency between the three tabs
2. Services tab uses dropdowns instead of a clear button
3. Different icons, styles, and sizes
4. No tooltip explaining the magic of template loading

## Design: Unified Template Button Component

Create a beautiful, consistent "Load Template" button that:
- Uses a **Wand2** (magic wand) icon from Lucide
- Has a distinctive gradient/accent style that stands out
- Includes a tooltip on hover explaining the benefit
- Works identically across all three tabs

### Button Design Specification

```text
+------------------------------------------+
| [✨ Wand Icon]  טען תבנית                 |
+------------------------------------------+
         ↓ Hover tooltip
+------------------------------------------+
| לחיצה תטען תבנית מוכנה מראש שתסייע לך    |
| למלא את הפרטים במהירות וביעילות          |
+------------------------------------------+
```

**Visual Properties:**
- Primary button variant with subtle gradient background
- Wand2 icon (magic wand) 
- Text: "טען תבנית"
- Loading state with Loader2 spinner
- Tooltip with clear explanation on mouseover

---

## Technical Implementation

### File 1: Create Reusable Component `src/components/rfp/LoadTemplateButton.tsx`

A new reusable component that encapsulates the button design:

```tsx
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wand2, Loader2 } from 'lucide-react';

interface LoadTemplateButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const LoadTemplateButton = ({
  onClick,
  loading = false,
  disabled = false,
  className
}: LoadTemplateButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            onClick={onClick}
            disabled={loading || disabled}
            className={cn(
              "gap-2 bg-gradient-to-r from-primary/10 to-primary/5",
              "border-primary/30 hover:border-primary/50",
              "hover:from-primary/20 hover:to-primary/10",
              "text-primary font-medium",
              className
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            טען תבנית
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          dir="rtl" 
          className="max-w-[250px] text-right"
        >
          <p>לחיצה תטען תבנית מוכנה מראש שתסייע לך למלא את הפרטים במהירות וביעילות</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

### File 2: Update `src/components/rfp/ServiceDetailsTab.tsx`

**Changes:**
1. Remove the template selection dropdowns (category/method) from the checklist section
2. Add the new LoadTemplateButton at the top of the checklist section
3. Keep the loadTemplatesForCategory logic, but trigger it via the button

**Current (lines 329-394):**
Complex dropdown-based template selection

**New:**
Simple button that triggers template loading

```tsx
{/* Load Template Button */}
<LoadTemplateButton
  onClick={() => loadTemplatesForCategory(selectedCategoryId)}
  loading={loadingTemplates}
  disabled={!advisorType}
/>
```

### File 3: Update `src/components/rfp/FeeItemsTable.tsx`

**Changes:**
1. Replace the current "טען תבנית" button (lines 186-201) with LoadTemplateButton
2. Remove FileDown icon import

**Current (lines 186-201):**
```tsx
<Button
  type="button"
  variant="secondary"
  size="sm"
  onClick={loadTemplates}
  disabled={loadingTemplates}
  className="flex items-center gap-2 flex-row-reverse flex-1 sm:flex-none"
>
  {loadingTemplates ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <FileDown className="h-4 w-4" />
  )}
  טען תבנית
</Button>
```

**New:**
```tsx
<LoadTemplateButton
  onClick={loadTemplates}
  loading={loadingTemplates}
  disabled={!advisorType}
/>
```

### File 4: Update `src/components/rfp/PaymentTermsTab.tsx`

**Changes:**
1. Replace the current "טען תבנית" button (lines 154-168) with LoadTemplateButton
2. Remove Database icon import

**Current (lines 154-168):**
```tsx
<Button
  type="button"
  variant="ghost"
  size="sm"
  onClick={loadTemplate}
  disabled={loadingTemplate}
  className="h-7 text-xs gap-1"
>
  {loadingTemplate ? (
    <Loader2 className="h-3 w-3 animate-spin" />
  ) : (
    <Database className="h-3 w-3" />
  )}
  {loadingTemplate ? 'טוען...' : 'טען תבנית'}
</Button>
```

**New:**
```tsx
<LoadTemplateButton
  onClick={loadTemplate}
  loading={loadingTemplate}
/>
```

---

## Template Loading Logic Connection

All three tabs correctly fetch from the admin-managed tables:

| Tab | Database Table | Filter Fields |
|-----|----------------|---------------|
| Services | `default_service_scope_templates` | `advisor_specialty`, `category_id`, `display_order` |
| Fee Items | `default_fee_item_templates` | `advisor_specialty`, `display_order` |
| Milestones | `milestone_templates` | `advisor_specialty`, `category_id`, `display_order` |

These tables are managed in the admin section at:
- **Route:** `/heyadmin/fee-templates/{advisorType}/{projectType}`
- **Component:** `FeeTemplatesByAdvisorProject.tsx`

The connection is already correctly implemented in each tab's `loadTemplates` function.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/rfp/LoadTemplateButton.tsx` | **NEW** - Create reusable button component |
| `src/components/rfp/ServiceDetailsTab.tsx` | Replace dropdown-based selection with LoadTemplateButton |
| `src/components/rfp/FeeItemsTable.tsx` | Replace existing button with LoadTemplateButton |
| `src/components/rfp/PaymentTermsTab.tsx` | Replace existing button with LoadTemplateButton |

---

## Visual Design

### Button States

**Default State:**
```
┌────────────────────────────────┐
│  ✨  טען תבנית                  │  ← Primary/10 gradient background
│                                │    Primary border
└────────────────────────────────┘
```

**Hover State:**
```
┌────────────────────────────────┐
│  ✨  טען תבנית                  │  ← Darker gradient
│                                │    Stronger border
├────────────────────────────────┤
│  לחיצה תטען תבנית מוכנה מראש   │  ← Tooltip appears
│  שתסייע לך למלא במהירות        │
└────────────────────────────────┘
```

**Loading State:**
```
┌────────────────────────────────┐
│  ⟳  טען תבנית                  │  ← Spinner replaces wand
│                                │    Button disabled
└────────────────────────────────┘
```

---

## Testing Checklist

1. Open "עריכת בקשה" dialog
2. Go to "פירוט שירותים" tab - verify LoadTemplateButton appears with wand icon
3. Hover over button - verify tooltip appears with explanation
4. Click button - verify templates load from database
5. Go to "שכר טרחה" tab - verify same button design
6. Hover and click - verify consistency
7. Go to "תשלום" tab - verify same button design
8. Verify all templates load from admin-managed tables


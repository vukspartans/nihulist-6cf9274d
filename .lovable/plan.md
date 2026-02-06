

# Plan: Fix PDF Export Issues & Standardize Export Buttons

## Part 1: Identified PDF Export Problems

### Issue 1: Missing Data Fields in `generateProposalPDF`

**Location**: `src/utils/generateProposalPDF.ts`

The current PDF generator is missing several important data fields that exist in the proposal:

| Missing Field | Impact |
|--------------|--------|
| `advisor_type` (specialty) | Users don't know what type of advisor this is |
| `consultant_request_notes` | Notes from consultant are not in PDF |
| `selected_services` | Services selected by consultant are not shown |
| `services_notes` | Service-specific notes are missing |
| `currency` | Always assumes ILS, but currency field exists |
| `charge_type` / `duration` for recurring fees | Fee calculations don't reflect recurring items |
| Project deadline | No deadline context in PDF |

**Current Interface** (lines 18-40):
```typescript
export interface ProposalPDFData {
  advisorName?: string;
  supplierName?: string;
  projectName: string;
  price: number;
  timelineDays: number;
  submittedAt: string;
  scopeText?: string;
  conditions?: {...};
  feeItems?: FeeLineItem[];
  milestones?: Array<{...}>;
  signaturePng?: string;
  stampImage?: string;
}
```

### Issue 2: Broken Fee Item Total Calculation

**Location**: `src/utils/generateProposalPDF.ts` lines 65-68

The `getItemTotal` helper doesn't account for recurring charges with duration:

```typescript
const getItemTotal = (item: FeeLineItem): number => {
  if (item.total !== undefined && item.total !== null && !isNaN(item.total)) return item.total;
  return (item.unitPrice || 0) * (item.quantity || 1);
  // MISSING: * (item.duration || 1) for recurring items
};
```

### Issue 3: Comparison PDF Missing Critical Data

**Location**: `src/utils/exportProposals.ts` lines 44-103

The comparison PDF export (`exportToPDF`) is very basic:
- English headers instead of Hebrew
- Missing fee breakdown comparisons
- Missing milestone comparisons  
- Missing conditions/terms
- No advisor company info
- No currency formatting alignment

**Current Table Headers (English)**:
```typescript
<th>Rank</th>
<th>Supplier</th>
<th>AI Score</th>
<th>Price (ILS)</th>
// etc.
```

### Issue 4: Print Window Timing Issue

**Location**: `src/utils/generateProposalPDF.ts` lines 307-315

The print dialog might open before images (signature, stamp) are fully loaded:

```typescript
printWindow.onload = () => {
  printWindow.print();  // Images might not be ready
};
```

### Issue 5: ConfirmProposalDialog Missing Fields

**Location**: `src/components/ConfirmProposalDialog.tsx` lines 86-108

The pre-submission PDF doesn't include:
- `charge_type` information in the data mapping
- `duration` for recurring items
- Conditions/payment terms

**Current mapping**:
```typescript
feeItems: feeLineItems.map(item => ({
  description: item.description,
  unit: item.unit || 'פאושלי',
  quantity: item.quantity || 1,
  unitPrice: item.unit_price || item.total,
  total: item.total,
  isOptional: item.is_optional || false,
  // MISSING: chargeType, duration
})),
```

---

## Part 2: Standardize PDF Export Buttons

### Current Button Designs (Inconsistent)

| Dialog | Icon | Text | Variant | Tooltip |
|--------|------|------|---------|---------|
| `ProposalDetailDialog` | `Printer` | (none) | `outline` icon button | "ייצוא PDF" |
| `ProposalComparisonDialog` | `FileText` | "PDF" | `outline` small | (none) |
| `ConfirmProposalDialog` | `Download` | "ייצוא ל-PDF" | `outline` small | (none) |

### Proposed Standardized Design

All PDF export buttons should use:
- **Icon**: `FileText` (represents PDF document)
- **Text**: "ייצוא PDF" (consistent Hebrew)
- **Variant**: `variant="outline"` with `size="sm"`
- **Tooltip**: "הורד את המסמך כקובץ PDF" (download document as PDF)
- **Loading State**: `Loader2` spinner with "מייצא..."

---

## Technical Implementation

### File 1: `src/utils/generateProposalPDF.ts`

**Change 1: Expand interface to include missing fields**
```typescript
export interface FeeLineItem {
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  isOptional?: boolean;
  chargeType?: string;   // NEW
  duration?: number;     // NEW
}

export interface ProposalPDFData {
  advisorName?: string;
  supplierName?: string;
  projectName: string;
  advisorType?: string;           // NEW - specialty
  price: number;
  timelineDays: number;
  submittedAt: string;
  currency?: string;              // NEW
  scopeText?: string;
  consultantNotes?: string;       // NEW
  selectedServices?: string[];    // NEW
  servicesNotes?: string;         // NEW
  conditions?: {
    payment_terms?: string;
    payment_term_type?: string;
    assumptions?: string;
    exclusions?: string;
    validity_days?: number;
  };
  feeItems?: FeeLineItem[];
  milestones?: Array<{
    description: string;
    percentage: number;
  }>;
  signaturePng?: string;
  stampImage?: string;
}
```

**Change 2: Fix total calculation for recurring items**
```typescript
const getItemTotal = (item: FeeLineItem): number => {
  if (item.total !== undefined && item.total !== null && !isNaN(item.total)) return item.total;
  const basePrice = (item.unitPrice || 0) * (item.quantity || 1);
  // Apply duration multiplier for recurring charges
  if (item.chargeType && item.chargeType !== 'one_time' && item.duration) {
    return basePrice * item.duration;
  }
  return basePrice;
};
```

**Change 3: Add advisor type to header**
```html
<div class="header">
  <h1>הצעת מחיר</h1>
  <p style="font-size: 18px; color: #4b5563;">${data.projectName}</p>
  ${data.advisorType ? `<p style="font-size: 14px; color: #6b7280;">${data.advisorType}</p>` : ''}
  <p style="font-size: 14px; color: #6b7280;">${data.supplierName}</p>
</div>
```

**Change 4: Add consultant notes section**
```typescript
let consultantNotesHtml = '';
if (data.consultantNotes) {
  consultantNotesHtml = `
    <h3 style="margin-top: 24px; margin-bottom: 12px; color: #374151;">הערות היועץ</h3>
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; font-size: 14px; white-space: pre-wrap;">
      ${data.consultantNotes}
    </div>
  `;
}
```

**Change 5: Fix image loading timing**
```typescript
// Wait for images to load before printing
const images = printWindow.document.querySelectorAll('img');
let loadedCount = 0;
const totalImages = images.length;

if (totalImages === 0) {
  printWindow.print();
} else {
  images.forEach(img => {
    if (img.complete) {
      loadedCount++;
      if (loadedCount === totalImages) printWindow.print();
    } else {
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) printWindow.print();
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalImages) printWindow.print();
      };
    }
  });
}
```

### File 2: `src/utils/exportProposals.ts`

**Change: Rewrite comparison PDF with Hebrew headers and more data**
```typescript
export const exportToPDF = async (proposals: Proposal[], projectName: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(amount);

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <title>${projectName} - השוואת הצעות</title>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 40px; color: #1f2937; }
        h1 { text-align: center; color: #1e40af; margin-bottom: 8px; }
        h2 { text-align: center; color: #6b7280; font-weight: normal; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { border: 1px solid #e5e7eb; padding: 12px 8px; text-align: right; }
        th { background-color: #f3f4f6; font-weight: 600; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .rank-1 { background-color: #d1fae5 !important; }
        .best-price { color: #059669; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <h1>${projectName}</h1>
      <h2>השוואת הצעות מחיר • ${new Date().toLocaleDateString('he-IL')}</h2>
      <table>
        <thead>
          <tr>
            <th>דירוג</th>
            <th>יועץ</th>
            <th>ציון AI</th>
            <th>מחיר</th>
            <th>לו"ז (ימים)</th>
            <th>המלצה</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          ${proposals.map(p => {
            const isBestPrice = p.price === Math.min(...proposals.map(x => x.price));
            return `
              <tr class="${p.evaluation_rank === 1 ? 'rank-1' : ''}">
                <td>${p.evaluation_rank || '-'}</td>
                <td>${p.supplier_name}</td>
                <td>${p.evaluation_score ? Math.round(p.evaluation_score) : '-'}</td>
                <td class="${isBestPrice ? 'best-price' : ''}">${formatCurrency(p.price)}</td>
                <td>${p.timeline_days}</td>
                <td>${p.evaluation_result?.recommendation_level || '-'}</td>
                <td>${getStatusLabel(p.status)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div class="footer">
        * כל המחירים ללא מע"מ • מסמך זה הופק באופן אוטומטי
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
};

// Helper for status labels
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    submitted: 'הוגש',
    accepted: 'אושר',
    rejected: 'נדחה',
    under_review: 'בבדיקה',
    draft: 'טיוטה',
    withdrawn: 'בוטל',
    negotiation_requested: 'משא ומתן',
    resubmitted: 'הוגש מחדש',
  };
  return labels[status] || status;
};
```

### File 3: Create `src/components/ui/ExportPDFButton.tsx`

Create a standardized reusable button component:

```tsx
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportPDFButtonProps {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  showText?: boolean;  // Show "ייצוא PDF" text, default true
}

export const ExportPDFButton = ({
  onClick,
  loading = false,
  disabled = false,
  className,
  showText = true,
}: ExportPDFButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClick}
            disabled={loading || disabled}
            className={cn("gap-2", className)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {showText && (loading ? 'מייצא...' : 'ייצוא PDF')}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" dir="rtl">
          הורד את המסמך כקובץ PDF
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

### File 4: Update `src/components/ProposalDetailDialog.tsx`

**Change 1: Update handleExportPDF to pass more data** (lines 424-453)
```typescript
const handleExportPDF = async () => {
  try {
    await generateProposalPDF({
      supplierName: proposal.supplier_name,
      projectName: projectName || 'פרויקט',
      advisorType: rfpContext?.advisor_type || undefined,  // NEW
      price: displayPrice,
      timelineDays: proposal.timeline_days,
      submittedAt: proposal.submitted_at,
      currency: proposal.currency,  // NEW
      scopeText: displayScopeText,
      consultantNotes: proposal.consultant_request_notes,  // NEW
      conditions: proposal.conditions_json,
      feeItems: feeLineItems.map((item) => ({
        description: item.description || item.name || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        total: getItemTotal(item),
        isOptional: item.is_optional,
        chargeType: item.charge_type,  // NEW
        duration: item.duration,        // NEW
      })),
      milestones: milestoneAdjustments.map((m) => ({
        description: m.description,
        percentage: m.consultant_percentage || m.entrepreneur_percentage,
      })),
      signaturePng: proposal.signature_blob || undefined,
      stampImage: proposal.signature_meta_json?.stampImage,
    });
    toast({ title: "PDF נפתח להדפסה" });
  } catch {
    toast({ title: "שגיאה ביצירת PDF", variant: "destructive" });
  }
};
```

**Change 2: Replace button with ExportPDFButton** (lines 649-656)
```tsx
import { ExportPDFButton } from '@/components/ui/ExportPDFButton';

// In the header:
<ExportPDFButton onClick={handleExportPDF} showText={false} />
```

### File 5: Update `src/components/ProposalComparisonDialog.tsx`

**Change: Replace PDF button with ExportPDFButton** (lines 643-651)
```tsx
import { ExportPDFButton } from '@/components/ui/ExportPDFButton';

// Replace:
<Button onClick={handleExportPDF} variant="outline" size="sm" className="flex items-center gap-2">
  PDF
  <FileText className="w-4 h-4" />
</Button>

// With:
<ExportPDFButton onClick={handleExportPDF} />
```

### File 6: Update `src/components/ConfirmProposalDialog.tsx`

**Change 1: Pass charge_type and duration to PDF** (lines 95-107)
```typescript
feeItems: feeLineItems.map(item => ({
  description: item.description,
  unit: item.unit || 'פאושלי',
  quantity: item.quantity || 1,
  unitPrice: item.unit_price || item.total,
  total: item.total,
  isOptional: item.is_optional || false,
  chargeType: item.charge_type,  // NEW
  duration: item.duration,        // NEW
})),
```

**Change 2: Replace button with ExportPDFButton** (lines 299-313)
```tsx
import { ExportPDFButton } from '@/components/ui/ExportPDFButton';

// Replace the existing button with:
<ExportPDFButton 
  onClick={handleExportPDF} 
  loading={isExporting}
/>
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/utils/generateProposalPDF.ts` | Expand interface, fix recurring fee calculations, add advisor type/notes, fix image loading timing |
| `src/utils/exportProposals.ts` | Rewrite with Hebrew headers, better formatting, status labels, VAT disclaimer |
| `src/components/ui/ExportPDFButton.tsx` | **NEW** - Standardized reusable PDF export button |
| `src/components/ProposalDetailDialog.tsx` | Pass additional fields, use ExportPDFButton |
| `src/components/ProposalComparisonDialog.tsx` | Use ExportPDFButton |
| `src/components/ConfirmProposalDialog.tsx` | Pass charge_type/duration, use ExportPDFButton |

---

## Testing Checklist

1. Open a proposal detail dialog and export to PDF
   - Verify advisor type appears in header
   - Verify all fee items render correctly including recurring fees
   - Verify milestones calculate amounts correctly
   - Verify signature/stamp images load before print dialog
   - Verify VAT disclaimer appears

2. Open proposal comparison dialog and export PDF
   - Verify Hebrew headers display correctly
   - Verify best price is highlighted
   - Verify rank 1 has green background
   - Verify status labels are in Hebrew

3. Open submit proposal confirmation and export PDF
   - Verify recurring fee items show correct totals
   - Verify all mandatory/optional items appear

4. Verify all three export buttons look identical:
   - Same `FileText` icon
   - Same tooltip text
   - Same hover/loading behavior



## Plan: Fix 3 Identified PDF Export & Import Issues

### Issue 1: Missing `selectedServices` in ProposalDetailDialog PDF Export

**Location**: `src/components/ProposalDetailDialog.tsx` lines 425-459

**Current State**:
The `handleExportPDF` function doesn't pass `selectedServices` or `servicesNotes` to the PDF generator, even though:
- The proposal object has these fields (line 69: `selected_services?: any[]; services_notes?: string;`)
- The PDF generator interface supports them (lines 29-30 in `generateProposalPDF.ts`)
- The PDF template has HTML rendering for these fields (lines 242-249 in `generateProposalPDF.ts`)

**Fix**:
Add two lines to the `handleExportPDF` function (after line 436):
```typescript
selectedServices: proposal.selected_services?.map(s => typeof s === 'string' ? s : s.name || s.description)
servicesNotes: proposal.services_notes,
```

**Impact**: Consultants' selected services will now appear in exported PDFs under "שירותים נבחרים" section.

---

### Issue 2: Missing `conditions` in ConfirmProposalDialog PDF Export

**Location**: `src/components/ConfirmProposalDialog.tsx` lines 86-126

**Current State**:
The `handleExportPDF` function in `ConfirmProposalDialog` only passes 7 fields to the PDF generator:
- `projectName`, `advisorName`, `submittedAt`, `price`, `timelineDays`, `feeItems`, `milestones`

**Missing Data**:
- `conditions` (payment terms, assumptions, exclusions, validity days) - these exist in the parent SubmitProposal component
- `scopeText` - service details text
- Other context fields

**Challenge**: 
The `ConfirmProposalDialog` interface doesn't accept `conditions` or `scopeText` as props. These need to be:
1. Added to the interface definition (lines 44-56)
2. Extracted from the parent SubmitProposal component
3. Passed through to the PDF data object

**Fix** (3-step):

**Step 1**: Update `ConfirmProposalDialogProps` interface to accept conditions and scopeText:
```typescript
interface ConfirmProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  price: string;
  timelineDays: string;
  fileCount: number;
  hasSignature: boolean;
  feeLineItems?: FeeLineItem[];
  milestones?: MilestoneItem[];
  projectName?: string;
  advisorName?: string;
  conditions?: {                    // NEW
    payment_terms?: string;
    assumptions?: string;
    exclusions?: string;
    validity_days?: number;
  };
  scopeText?: string;              // NEW
}
```

**Step 2**: Destructure new props in the function signature:
```typescript
export function ConfirmProposalDialog({
  open,
  onOpenChange,
  onConfirm,
  price,
  timelineDays,
  fileCount,
  hasSignature,
  feeLineItems = [],
  milestones = [],
  projectName = 'פרויקט',
  advisorName = 'יועץ',
  conditions,                       // NEW
  scopeText,                        // NEW
}: ConfirmProposalDialogProps)
```

**Step 3**: Add to handleExportPDF pdfData object (after line 108):
```typescript
conditions: conditions,
scopeText: scopeText,
```

**Step 4**: Update the call in SubmitProposal.tsx (lines 1416-1444) to pass these fields:
```typescript
<ConfirmProposalDialog 
  open={showConfirmDialog} 
  onOpenChange={setShowConfirmDialog} 
  onConfirm={handleFinalSubmit} 
  price={price} 
  timelineDays={timelineDays} 
  fileCount={files.length}
  hasSignature={!!signature}
  conditions={paymentTerms}        // NEW - from SubmitProposal state
  scopeText={scopeText}            // NEW - from SubmitProposal state
  feeLineItems={[...]}
  milestones={[...]}
/>
```

**Impact**: Payment terms and service scope will now be included in the pre-submission PDF export, ensuring entrepreneurs have full transparency before final confirmation.

---

### Issue 3: Unused `Wand2` Import in ServiceDetailsTab

**Location**: `src/components/rfp/ServiceDetailsTab.tsx` line 10

**Current State**:
The import statement includes `Wand2` but it's not used anywhere in the component:
```typescript
import { FileText, Upload, List, Plus, X, Loader2, FolderOpen, FileStack, ChevronDown, Wand2 } from 'lucide-react';
```

**Reason**: The `LoadTemplateButton` moved to the header row and now uses the `Wand2` icon, but it's imported in that component (`LoadTemplateButton.tsx`), not in `ServiceDetailsTab.tsx`.

**Fix**:
Remove `Wand2` from the import statement (line 10).

**Impact**: Clean up unused imports, reduce bundle size slightly, improve code maintainability.

---

## Summary of Changes

| File | Change Type | Details |
|------|-------------|---------|
| `src/components/ProposalDetailDialog.tsx` | Add 2 lines | Pass `selectedServices` and `servicesNotes` to PDF |
| `src/components/ConfirmProposalDialog.tsx` | Add 2 props + 2 lines | Accept and pass conditions/scopeText |
| `src/pages/SubmitProposal.tsx` | Update 1 component | Pass new props to ConfirmProposalDialog |
| `src/components/rfp/ServiceDetailsTab.tsx` | Remove 1 import | Clean up unused `Wand2` |

---

## Testing Checklist

After implementation:

1. **ProposalDetailDialog PDF**
   - Open a proposal with selected services
   - Click "ייצוא PDF"
   - Verify "שירותים נבחרים" section appears with selected services
   - Verify "הערות שירותים" appears if servicesNotes exist

2. **ConfirmProposalDialog PDF**
   - Open the proposal submission confirmation dialog
   - Click "ייצוא PDF"
   - Verify payment terms appear in the PDF
   - Verify assumptions/exclusions appear if defined
   - Verify scope text appears if defined

3. **Import Cleanup**
   - Check ServiceDetailsTab compiles without errors
   - Verify no visual changes in the component
   - Confirm LoadTemplateButton still shows Wand2 icon correctly

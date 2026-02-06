

# Plan: Fix RTL and Enable All Service Details Modes in עריכת בקשה

## Problem Analysis

### Issue 1: RTL Tab Order
The current tab order in `ServiceDetailsTab.tsx` (line 310-323):
```tsx
<TabsList className="grid w-full grid-cols-3 flex-row-reverse">
  <TabsTrigger value="free_text">מלל חופשי</TabsTrigger>   // Appears left
  <TabsTrigger value="file">העלאת קובץ</TabsTrigger>        // Middle
  <TabsTrigger value="checklist">רשימת שירותים</TabsTrigger> // Appears right
</TabsList>
```

**Requested order (right to left):**
1. רשימת שירותים (checklist) - far right
2. מלל חופשי (free_text) - middle
3. העלאת קובץ (file) - far left

### Issue 2: Mutually Exclusive Modes
Currently, users can only select ONE mode at a time. The entrepreneur should be able to:
- Use the checklist to define structured service items
- Add free text for additional notes/details
- Upload a file with supplementary documentation

All entered data should be saved and presented to the vendor.

## Solution Approach

Change from tabs (exclusive) to collapsible accordion sections (inclusive). Each section can be opened and used independently:

```text
+------------------------------------------+
| ▼ רשימת שירותים                           |
|   [Service checklist items...]           |
+------------------------------------------+
| ▼ הערות נוספות (מלל חופשי)                 |
|   [Free text area...]                    |
+------------------------------------------+
| ▼ קובץ פירוט (אופציונלי)                   |
|   [File upload area...]                  |
+------------------------------------------+
```

## Technical Implementation

### File 1: `src/components/rfp/ServiceDetailsTab.tsx`

**Changes:**
1. Replace `Tabs` with `Collapsible` sections (already imported in the file)
2. Remove `mode` and `onModeChange` props - no longer needed for single selection
3. Keep all content handlers (freeText, file, scopeItems)
4. Create 3 collapsible sections in the correct RTL order

**Updated Component Structure:**
```tsx
return (
  <div className="space-y-4" dir="rtl">
    {/* Section 1: Service Checklist (always first) */}
    <Collapsible defaultOpen className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4" />
          <span className="font-medium">רשימת שירותים</span>
        </div>
        <ChevronDown className="h-4 w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 pt-0 border-t">
        {/* Existing checklist content */}
      </CollapsibleContent>
    </Collapsible>

    {/* Section 2: Free Text Notes */}
    <Collapsible className="border rounded-lg">
      <CollapsibleTrigger className="...">
        <FileText className="h-4 w-4" />
        הערות נוספות (מלל חופשי)
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Existing textarea content */}
      </CollapsibleContent>
    </Collapsible>

    {/* Section 3: File Upload */}
    <Collapsible className="border rounded-lg">
      <CollapsibleTrigger className="...">
        <Upload className="h-4 w-4" />
        קובץ פירוט (אופציונלי)
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Existing file upload content */}
      </CollapsibleContent>
    </Collapsible>
  </div>
);
```

### File 2: `src/types/rfpRequest.ts`

**Changes:**
- Remove `ServiceDetailsMode` type (no longer needed)
- Update `AdvisorTypeRequestData` interface to remove `serviceDetailsMode` field

### File 3: `src/components/RequestEditorDialog.tsx`

**Changes:**
- Remove `serviceDetailsMode` from form data handling
- Update `ServiceDetailsTab` usage to remove mode props
- Keep all other data persistence (freeText, file, scopeItems)

### File 4: `src/hooks/useRFPDraft.ts`

**Changes:**
- Remove `service_details_mode` from save/load logic (backward compatible - field can remain in DB but ignored)

### File 5: `src/pages/SubmitProposal.tsx`

**Changes:**
- Update vendor view to display ALL service detail sections (not just one based on mode)
- Show checklist items if present
- Show free text if present
- Show file if present

**Updated Display Logic:**
```tsx
{/* Show checklist items if any */}
{entrepreneurData?.service_scope_items?.length > 0 && (
  <div>
    <Label>רשימת שירותים נדרשים</Label>
    {/* Render checklist items */}
  </div>
)}

{/* Show free text if any */}
{entrepreneurData?.service_details_text && (
  <div>
    <Label>הערות נוספות מהיזם</Label>
    <div className="...">{entrepreneurData.service_details_text}</div>
  </div>
)}

{/* Show file if uploaded */}
{entrepreneurData?.service_details_file && (
  <div>
    <Label>קובץ פירוט שירותים</Label>
    <a href={...}>{entrepreneurData.service_details_file.name}</a>
  </div>
)}
```

### File 6: `src/hooks/useRFP.tsx`

**Changes:**
- Update RFP sending logic to always save all three data types
- Remove mode-based conditional saving

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/rfp/ServiceDetailsTab.tsx` | Replace Tabs with Collapsible sections, RTL order |
| `src/types/rfpRequest.ts` | Remove ServiceDetailsMode, update interface |
| `src/components/RequestEditorDialog.tsx` | Remove mode handling from form data |
| `src/hooks/useRFPDraft.ts` | Update save/load to handle all fields always |
| `src/hooks/useRFP.tsx` | Always save all service details data |
| `src/pages/SubmitProposal.tsx` | Display all service details sections to vendor |

---

## Backward Compatibility

The `service_details_mode` column will remain in the database but will be ignored. New RFPs will save all data regardless of which sections the user fills out. Existing RFPs will continue to work - the vendor view will simply show whatever data exists.

---

## UX Flow After Changes

**For Entrepreneur (RFP Creation):**
1. Open "פירוט שירותים" tab
2. See 3 collapsible sections (checklist expanded by default)
3. Fill in checklist items (services to include/exclude)
4. Optionally expand and add free text notes
5. Optionally expand and upload a file
6. All data is saved and sent to vendors

**For Vendor (SubmitProposal):**
1. Open "פרטי הבקשה" tab
2. See all filled sections from entrepreneur:
   - Service checklist (if any items defined)
   - Free text notes (if provided)
   - File attachment (if uploaded)

---

## Testing Checklist

1. Open "עריכת בקשה" dialog
2. Go to "פירוט שירותים" tab
3. Verify collapsible sections appear in RTL order (checklist first)
4. Add items to checklist, add free text, upload file
5. Save and close dialog
6. Re-open dialog - verify all data persisted
7. Send RFP to vendor
8. As vendor, open SubmitProposal page
9. Verify all three data types are visible


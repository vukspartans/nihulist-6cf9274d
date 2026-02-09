

# Services Tab: Two-Level Header + Items Structure

## What the client wants

Based on the reference image, the Services (שירותים) tab inside a category should have a **two-level structure**:

1. **Headers (כותרות)** - group titles like "היקף העבודה", "ליווי מול רשויות"
2. **Service items** - nested under each header with description, optional toggle, edit/delete

### UI Flow:
- **"+ הוסף כותרת"** button at the top creates a new header (simple dialog with just a title field)
- Each header is displayed as a collapsible section with its own **"+ הוסף שירות"** button
- Service items under each header show: description, optional badge, edit/delete icons
- Creating a service item opens a dialog pre-filled with the selected header name

## Technical Approach

Use the existing `default_fee_category` column on `default_service_scope_templates` as the grouping key for headers. No schema changes needed.

### Changes:

**1. `src/pages/admin/FeeTemplatesByCategory.tsx` - Services Tab section (lines 490-517)**

Replace the flat SortableDataTable with a grouped view:
- Group services by `default_fee_category` to create header sections
- Each header section is a Card/Collapsible with:
  - Header title on the right
  - Edit (pencil) and Delete (trash) icons for the header
  - "חובה" badge count
  - "+ הוסף שירות" button on the left
- Under each header: a list of service items with edit/delete/optional badge
- Top-level "+ הוסף כותרת" button opens a simple dialog

**2. Create a simple "Create Header" dialog** (inline or small component)

- Single field: "כותרת *" with placeholder "היקף העבודה"
- This just registers a new `default_fee_category` value (stored in a local list or as an empty service scope template marked as header)

Since `default_fee_category` is a free-text field, creating a "header" means:
- Adding the header name to the `DEFAULT_FEE_CATEGORIES` list is not practical (it's per-category)
- Instead: create a service scope template with `task_name` = header name and a special marker (e.g., `default_fee_category` = the header name itself), OR
- Simpler: just use the `default_fee_category` field as-is. When creating a new "כותרת", we simply create a placeholder service template with `task_name = default_fee_category = headerName`. The grouping logic in the UI groups all services by their `default_fee_category` value.

**Best approach**: Group services by `default_fee_category` in the UI. The "+ הוסף כותרת" button adds a new category name to a local list. The "+ הוסף שירות" button pre-fills `default_fee_category` with the header name. Services without a category go under a "כללי" default group.

**3. Update `CreateServiceScopeTemplateDialog.tsx`**

- Accept a `defaultHeader` prop that pre-fills the `default_fee_category` field
- The dialog shows: header name (read-only, pre-filled), description (task_name), free text field, optional toggle

**4. Update `EditServiceScopeTemplateDialog.tsx`**

- Allow changing the header (fee category) assignment

## Files to modify

| File | Change |
|------|--------|
| `src/pages/admin/FeeTemplatesByCategory.tsx` | Rewrite Services tab section to group by `default_fee_category` with collapsible headers, add "Create Header" inline dialog |
| `src/components/admin/CreateServiceScopeTemplateDialog.tsx` | Accept `defaultHeader` prop to pre-fill the fee category |
| `src/constants/rfpUnits.ts` | No change needed - headers are dynamic per category |

## No database changes required

The existing `default_fee_category` column on `default_service_scope_templates` serves as the grouping key.


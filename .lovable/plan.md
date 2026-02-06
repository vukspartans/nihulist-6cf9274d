
# Plan: Recurring Payment Support for Fee Items

## Problem Summary

The system already has a `charge_type` field with values like `one_time`, `monthly`, `hourly`, `per_visit`, but there's no way to:
1. Define **duration** (how many months/visits/hours the payment recurs)
2. **Calculate total project cost** (e.g., ₪15,000/month × 12 = ₪180,000)
3. **Display recurring pricing clearly** (e.g., "₪15,000/חודש (סה"כ: ₪180,000)")

This feature is essential for services like ongoing project management, monthly inspections, or hourly consulting that aren't one-time fees.

---

## Solution Overview

### Data Model Enhancement

Add a `duration` field to fee items that specifies:
- For `monthly`: number of months
- For `hourly`: estimated hours
- For `per_visit`: number of visits

The **total** will be calculated as: `unit_price × quantity × duration`

### Display Format

For recurring items, show:
```
₪15,000/חודש × 12 חודשים (סה"כ: ₪180,000)
```

For one-time items (unchanged):
```
₪15,000
```

---

## Technical Implementation

### Part 1: Type Definitions

**File: `src/types/rfpRequest.ts`**

Extend `RFPFeeItem` interface:
```typescript
export interface RFPFeeItem {
  id?: string;
  item_number: number;
  description: string;
  unit: FeeUnit;
  quantity: number;
  unit_price?: number;
  charge_type: ChargeType;
  is_optional: boolean;
  display_order: number;
  
  // NEW: Recurring payment fields
  duration?: number;          // Number of periods (months/hours/visits)
  duration_unit?: 'months' | 'hours' | 'visits' | 'units';
}
```

**File: `src/constants/rfpUnits.ts`**

Add duration unit labels:
```typescript
export const DURATION_UNIT_LABELS: Record<string, string> = {
  months: 'חודשים',
  hours: 'שעות',
  visits: 'ביקורים',
  units: 'יחידות',
};

// Map charge_type to default duration_unit
export const CHARGE_TYPE_DURATION_MAP: Record<ChargeType, string | null> = {
  one_time: null,           // No duration needed
  monthly: 'months',        // Duration in months
  hourly: 'hours',          // Duration in hours
  per_visit: 'visits',      // Duration in visits
  per_unit: 'units',        // Duration in units
};
```

### Part 2: Database Schema

**Migration: Add duration columns**
```sql
ALTER TABLE rfp_request_fee_items 
ADD COLUMN duration numeric DEFAULT NULL,
ADD COLUMN duration_unit text DEFAULT NULL;
```

The `fee_line_items` JSONB in proposals will also include these fields.

### Part 3: UI Updates

#### A. Entrepreneur Fee Table (`FeeItemsTable.tsx`)

Add duration input when charge_type is not `one_time`:

```text
┌──────────────────────────────────────────────────────────────────┐
│ תיאור      │ יחידה │ כמות │ סוג החיוב │ משך      │ פעולות      │
├──────────────────────────────────────────────────────────────────┤
│ ניהול פרויקט │ חודש  │  1   │ חודשי     │ 12 חודשים │  🗑️        │
│ ביקורי פיקוח │ ביקור │  1   │ לביקור    │ 24 ביקורים│  🗑️        │
└──────────────────────────────────────────────────────────────────┘
```

**Conditional duration input:**
```tsx
{/* Show duration field only for recurring charge types */}
{item.charge_type !== 'one_time' && (
  <div className="flex items-center gap-1">
    <Input
      type="number"
      min="1"
      value={item.duration || ''}
      onChange={(e) => updateItem(index, 'duration', Number(e.target.value) || 1, isOptional)}
      className="w-16 text-center"
      placeholder="12"
    />
    <span className="text-xs text-muted-foreground">
      {getDurationUnitLabel(item.charge_type)}
    </span>
  </div>
)}
```

#### B. Consultant Fee Table (`ConsultantFeeTable.tsx`)

Show duration info in read-only mode and calculate totals correctly:

```tsx
// Calculate row total including duration
const calculateRowTotal = (item: RFPFeeItem, unitPrice: number) => {
  const qty = item.quantity || 1;
  const duration = item.duration || 1;
  return unitPrice * qty * duration;
};

// Display format
<TableCell>
  {item.charge_type !== 'one_time' && item.duration ? (
    <div className="flex flex-col">
      <span>{formatPrice(unitPrice)}/{getChargeTypeLabel(item.charge_type)}</span>
      <span className="text-xs text-muted-foreground">
        × {item.duration} {getDurationUnitLabel(item.charge_type)}
      </span>
    </div>
  ) : (
    formatPrice(unitPrice)
  )}
</TableCell>
```

#### C. Proposal Confirmation Dialog (`ConfirmProposalDialog.tsx`)

Show recurring items with full breakdown:

```tsx
<div className="flex justify-between items-start text-sm py-1">
  <div className="flex flex-col">
    <span>{item.description}</span>
    {item.charge_type !== 'one_time' && item.duration && (
      <span className="text-xs text-muted-foreground">
        ₪{formatAmount(item.unit_price)}/{getChargeTypeLabel(item.charge_type)} × {item.duration} {getDurationUnitLabel(item.charge_type)}
      </span>
    )}
  </div>
  <span className="font-medium">{formatAmount(item.total)}</span>
</div>
```

#### D. Proposal Detail Dialog & Comparison Table

Update price displays to show recurring breakdown:

```tsx
// Helper function for formatting recurring prices
const formatRecurringPrice = (item: FeeLineItem) => {
  if (item.charge_type === 'one_time' || !item.duration) {
    return formatCurrency(item.total || 0);
  }
  
  return (
    <div className="flex flex-col">
      <span>{formatCurrency(item.unit_price || 0)}/{getChargeTypeLabel(item.charge_type)}</span>
      <span className="text-xs text-muted-foreground">
        סה"כ {item.duration} {getDurationUnitLabel(item.charge_type)}: {formatCurrency(item.total || 0)}
      </span>
    </div>
  );
};
```

#### E. Negotiation Views

Update `EnhancedLineItemTable.tsx` to handle duration in calculations:
- Display duration info for recurring items
- Ensure adjustments preserve duration
- Calculate totals correctly: `unit_price × quantity × duration`

### Part 4: Calculation Logic Updates

**All price calculation points need updating:**

1. **`ConsultantFeeTable.tsx`** - Row totals
2. **`SubmitProposal.tsx`** - `calculateTotalFromFees()` 
3. **`EnhancedLineItemTable.tsx`** - Totals calculation
4. **`ProposalComparisonTable.tsx`** - `calculateTotals()`
5. **PDF generation** - `generateProposalPDF.ts`

**Updated calculation:**
```typescript
const calculateItemTotal = (item: FeeLineItem) => {
  const unitPrice = item.unit_price ?? 0;
  const quantity = item.quantity ?? 1;
  const duration = item.duration ?? 1;
  return unitPrice * quantity * duration;
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/rfpRequest.ts` | Add `duration`, `duration_unit` to RFPFeeItem |
| `src/constants/rfpUnits.ts` | Add duration labels and charge type mapping |
| `src/components/rfp/FeeItemsTable.tsx` | Add duration input column |
| `src/components/proposal/ConsultantFeeTable.tsx` | Display duration, update calculations |
| `src/components/ConfirmProposalDialog.tsx` | Show recurring breakdown |
| `src/components/ProposalDetailDialog.tsx` | Display recurring info |
| `src/components/ProposalComparisonTable.tsx` | Update totals calculation |
| `src/components/negotiation/EnhancedLineItemTable.tsx` | Handle duration in adjustments |
| `src/pages/SubmitProposal.tsx` | Update total calculation |
| `src/hooks/useProposalSubmit.ts` | Include duration in submission |
| `src/hooks/useRFP.tsx` | Handle duration when saving fee items |
| `supabase/migrations/` | Add duration columns to database |

---

## UI/UX Considerations

1. **Smart Defaults**: When charge_type changes to `monthly`, auto-set duration to 12
2. **Conditional Display**: Only show duration field when charge_type is recurring
3. **Clear Labeling**: Use Hebrew labels (12 חודשים, 24 ביקורים)
4. **Total Visibility**: Always show calculated total prominently
5. **RTL Compliance**: All new UI elements follow existing RTL patterns

---

## Testing Checklist

1. **Entrepreneur Flow**:
   - [ ] Create RFP with monthly fee item (e.g., project management)
   - [ ] Set duration to 12 months
   - [ ] Verify duration saves correctly

2. **Consultant Flow**:
   - [ ] Receive RFP with recurring items
   - [ ] Enter unit price and see total calculated with duration
   - [ ] Submit proposal with recurring items

3. **Comparison/Review**:
   - [ ] View proposal detail - see "₪15,000/חודש × 12 (סה"כ: ₪180,000)"
   - [ ] Compare proposals - totals include duration calculations
   - [ ] PDF export shows recurring breakdown

4. **Negotiation**:
   - [ ] Start negotiation with recurring items
   - [ ] Adjust unit price - total updates correctly
   - [ ] Accept/counter with preserved duration

5. **Edge Cases**:
   - [ ] Mixed one-time and recurring items in same proposal
   - [ ] Duration of 1 (display same as one-time)
   - [ ] Missing duration defaults to 1

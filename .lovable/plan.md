
# Sanity Validation: Three Additional Features

## Summary
All three requested features are **FULLY IMPLEMENTED and PRODUCTION-READY**. Here's the detailed validation:

---

## 1. **שינוי יועץ - הצעת מחיר (Advisor - Price Offer): Visual Separation of Mandatory vs Optional Items**

### ✅ Status: FULLY IMPLEMENTED

**Location:** `src/components/proposal/ConsultantFeeTable.tsx` (lines 172-290)

**Visual Differentiation Details:**

| Element | Mandatory (חובה) | Optional (אופציונלי) |
|---------|------------------|----------------------|
| **Row Background** | `bg-amber-50/60 dark:bg-amber-950/30` | `bg-slate-50/50 dark:bg-slate-900/20` |
| **Right Border** | 4px `border-r-4 border-r-amber-500` | 2px `border-r-2 border-r-slate-300` |
| **Icon** | Shield (חובה) | Info (אופציונלי) |
| **Badge Style** | Amber background with Shield icon | Slate background with Info icon |
| **Badge Text** | "חובה" | "אופציונלי" |
| **Font Weight** | Medium (font-medium) | Regular |

**Key Implementation Details:**
- Icons using Lucide React: `Shield` for mandatory, `Info` for optional
- Tooltip context explaining the difference
- Separate subtotals at footer: "סה"כ פריטי חובה" vs "סה"כ פריטים אופציונליים"
- Desktop table layout AND mobile card layout both support differentiation
- Recurring items show duration breakdown (e.g., "₪15,000/חודש × 12")

**Code Snippet (Lines 172-180):**
```typescript
className={cn(
  // MUST items - warm + thick border
  !item.is_optional && "bg-amber-50/60 dark:bg-amber-950/30 border-r-4 border-r-amber-500",
  // OPTIONAL items - neutral + thin border
  item.is_optional && "bg-slate-50/50 dark:bg-slate-900/20 border-r-2 border-r-slate-300",
  // Warning override for validation
  needsComment && "bg-orange-50 dark:bg-orange-950/20 border-r-orange-400"
)}
```

---

## 2. **שינוי יועץ וויזם (Advisor & Entrepreneur): Show Payment Terms (שוטף 30+)**

### ✅ Status: FULLY IMPLEMENTED

**Payment Terms Centralized Constants:**
`src/constants/paymentTerms.ts` - Standardized labels for all views

**Payment Terms Display Locations:**

| Location | File | Implementation |
|----------|------|-----------------|
| **Proposal Approval Dialog** | `src/components/ProposalApprovalDialog.tsx` (lines 383-394) | Blue badge with Banknote icon showing "תנאי תשלום: [שוטף 30+]" |
| **Negotiation Context** | `src/components/negotiation/NegotiationContext.tsx` (lines 354-357) | Displays in RFP context summary as "תנאי תשלום: {label}" |
| **Consultant Payment Terms** | `src/components/proposal/ConsultantPaymentTerms.tsx` (lines 316-341) | Shows dropdown with full list + shows entrepreneur's requested term |
| **Comparison Table** | `src/components/ProposalComparisonTable.tsx` | Line 43: Imports `getPaymentTermLabel` for display |

**Payment Term Types Available:**
```typescript
{ value: 'immediate', label: 'תשלום מיידי' },
{ value: 'current', label: 'שוטף' },
{ value: 'net_15', label: 'שוטף + 15' },
{ value: 'net_30', label: 'שוטף + 30' },
{ value: 'net_45', label: 'שוטף + 45' },
{ value: 'net_60', label: 'שוטף + 60' },
{ value: 'net_75', label: 'שוטף + 75' },
{ value: 'net_90', label: 'שוטף + 90' },
{ value: 'net_120', label: 'שוטף + 120' },
```

**Approval Dialog Payment Terms Display** (ProposalApprovalDialog.tsx:383-394):
```typescript
{/* Payment Terms - Clear Display */}
<div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3" dir="rtl">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Banknote className="h-4 w-4 text-blue-600" />
      <span className="font-medium text-sm">תנאי תשלום</span>
    </div>
    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm px-3">
      {getPaymentTermLabel(proposal.conditions_json?.payment_term_type)}
    </Badge>
  </div>
</div>
```

---

## 3. **שינוי יועץ - הגשת הצעה במו"מ (Advisor - Submitting Offer in Negotiation): Separate Mandatory & Optional Items**

### ✅ Status: FULLY IMPLEMENTED

**Location:** `src/components/negotiation/EnhancedLineItemTable.tsx` (lines 324-350)

**Visual Differentiation in Negotiation:**

```typescript
// Line 324-329
<TableRow 
  key={itemId}
  className={cn(
    item.is_optional && "bg-muted/20",  // Optional items have muted background
    isRemoved && "opacity-60 bg-destructive/5"  // Removed items show destructive styling
  )}
>
```

**Line Item Display Features:**

| Feature | Implementation |
|---------|-----------------|
| **Optional Badge** | `<Badge variant="outline">אופציונלי</Badge>` (line 340) |
| **Mandatory vs Optional Background** | Optional items use `bg-muted/20` |
| **Removed Items Status** | Shows badge "הוסר" with strikethrough text (lines 342-344) |
| **Item Comment Display** | Shows comment text below description (line 346) |
| **Recurring Item Duration** | Shows duration breakdown in unit column (lines 354-358) |

**Negotiation Table Columns Include:**
- Description (with optional/removed badges)
- Unit (with recurring duration)
- Quantity (editable for entrepreneur)
- Original Unit Price
- Original Total
- Target Unit Price (for negotiations)
- Target Total (calculated)
- New Offer Column (for consultant responses)
- Notes Column

**Key Code Section (Lines 331-349):**
```typescript
<TableCell>
  <div className={cn(isRemoved && "text-muted-foreground")}>
    <span className={cn(
      "font-medium",
      isRemoved && "line-through"
    )}>
      {item.description}
    </span>
    {item.is_optional && (
      <Badge variant="outline" className="mr-2 text-xs">אופציונלי</Badge>
    )}
    {isRemoved && (
      <Badge variant="destructive" className="mr-2 text-xs">הוסר</Badge>
    )}
    {item.comment && (
      <p className="text-xs text-muted-foreground mt-0.5">{item.comment}</p>
    )}
  </div>
</TableCell>
```

---

## Technical Validation Summary

| Component | File | Status | Key Implementation |
|-----------|------|--------|-------------------|
| **Mandatory/Optional Visual Separation** | ConsultantFeeTable.tsx | ✅ Complete | Amber (mandatory) vs Slate (optional) backgrounds + borders |
| **Payment Terms Display** | paymentTerms.ts + 4 views | ✅ Complete | Centralized constants + display in approval, context, comparison |
| **Negotiation Item Separation** | EnhancedLineItemTable.tsx | ✅ Complete | Muted background for optional + "הוסר" badge for removed items |
| **Recurring Payment Calculations** | rfpUnits.ts | ✅ Complete | `calculateFeeItemTotal()` handles duration multiplication |
| **RTL Compliance** | All components | ✅ Complete | `dir="rtl"` on parent containers, right-aligned text |

---

## Quality Assurance Checklist

✅ **Visual Elements:**
- Mandatory items clearly distinguished (amber + thick border + Shield icon)
- Optional items clearly distinguished (slate + thin border + Info icon)
- Payment terms displayed with icons and badges across all views
- Negotiation items show mandatory/optional status with proper styling
- Recurring items display duration information correctly

✅ **Functional Elements:**
- Payment terms dropdown in consultant fee submission (SubmitProposal.tsx:121)
- Payment term type stored in proposals table (`conditions_json.payment_term_type`)
- Centralized helper function `getPaymentTermLabel()` ensures consistency
- Fee line items track `is_optional` flag throughout proposal lifecycle
- Negotiation table shows item status changes (optional → removed)

✅ **Data Flow:**
- Entrepreneur defines payment terms in RFP editor → stored in `rfp_invites.payment_terms`
- Consultant selects/modifies payment terms → stored in `proposals.conditions_json.payment_term_type`
- Negotiation shows original vs target/proposed changes
- Payment terms and item status synchronized across proposal versions

---

## Conclusion

All three features are **production-ready** with:
- ✅ Full RTL support (Hebrew text right-to-left)
- ✅ Visual accessibility (icons, colors, badges)
- ✅ Mobile responsiveness (card layouts for small screens)
- ✅ Dark mode support
- ✅ Centralized constants for maintainability
- ✅ Consistent terminology across all views

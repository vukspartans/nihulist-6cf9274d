

# תכנית: תצוגה ברורה של תנאי תשלום בכל המערכת

## סיכום הבעיה

תנאי התשלום (כגון "שוטף + 30") צריכים להיות גלויים וברורים **בכל המסכים הרלוונטיים** עבור שני הצדדים: יזם ויועץ. נכון להיום:

| מסך | סטטוס נוכחי |
|-----|-------------|
| RFP Wizard (PaymentTermsTab) | ✅ מוצג עם dropdown מלא |
| Submit Proposal (Consultant) | ✅ מוצג עם dropdown |
| Proposal Detail Dialog | ⚠️ מוצג אך חסרות אפשרויות חדשות |
| Proposal Approval Dialog | ❌ **לא מוצג כלל** |
| Proposal Comparison Table | ❌ **לא מוצג כלל** |
| PDF Generation | ⚠️ מוצג רק מתוך conditions_json |
| Negotiation Views | ✅ מוצג עם פונקציית עזר |

---

## הפתרון: קובץ Constants מרכזי

### בעיה נוכחית
הגדרות תנאי תשלום **מפוזרות** ב-6+ קבצים:
- `PaymentTermsTab.tsx` (שורות 21-31)
- `ConsultantPaymentTerms.tsx` (שורות 311-320)
- `NegotiationContext.tsx` (שורות 93-103)
- `ProposalDetailDialog.tsx` (שורות 1100-1106)
- `RFPDetails.tsx` (שורות 117-122)
- `useProposalSubmit.ts` (שורות 486-491)

### פתרון
יצירת קובץ `src/constants/paymentTerms.ts` מרכזי:

```typescript
// src/constants/paymentTerms.ts

export const PAYMENT_TERM_TYPES = [
  { value: 'immediate', label: 'תשלום מיידי', labelEn: 'Immediate Payment' },
  { value: 'current', label: 'שוטף', labelEn: 'Current' },
  { value: 'net_15', label: 'שוטף + 15', labelEn: 'Net 15' },
  { value: 'net_30', label: 'שוטף + 30', labelEn: 'Net 30' },
  { value: 'net_45', label: 'שוטף + 45', labelEn: 'Net 45' },
  { value: 'net_60', label: 'שוטף + 60', labelEn: 'Net 60' },
  { value: 'net_75', label: 'שוטף + 75', labelEn: 'Net 75' },
  { value: 'net_90', label: 'שוטף + 90', labelEn: 'Net 90' },
  { value: 'net_120', label: 'שוטף + 120', labelEn: 'Net 120' },
] as const;

export type PaymentTermType = typeof PAYMENT_TERM_TYPES[number]['value'];

export const DEFAULT_PAYMENT_TERM: PaymentTermType = 'net_30';

// Helper function - returns Hebrew label
export const getPaymentTermLabel = (value: string | null | undefined): string => {
  const term = PAYMENT_TERM_TYPES.find(t => t.value === value);
  return term?.label || value || 'לא צוין';
};

// Helper function - returns English label
export const getPaymentTermLabelEn = (value: string | null | undefined): string => {
  const term = PAYMENT_TERM_TYPES.find(t => t.value === value);
  return term?.labelEn || value || 'Not specified';
};
```

---

## שינויים לפי מסך

### 1. Proposal Approval Dialog (אישור הצעת מחיר)

**קובץ:** `src/components/ProposalApprovalDialog.tsx`

**בעיה:** תנאי תשלום לא מוצגים כלל בדיאלוג האישור

**פתרון:** הוספת תצוגת תנאי תשלום בולטת בחלק העליון של הסיכום

```tsx
// הוספה אחרי Price Breakdown Summary (שורה ~403)
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

### 2. Proposal Comparison Table (טבלת השוואת הצעות)

**קובץ:** `src/components/ProposalComparisonTable.tsx`

**בעיה:** תנאי תשלום לא מוצגים בטבלת ההשוואה

**פתרון:** הוספת עמודה "תנאי תשלום" לטבלה

```tsx
// הוספה לכותרות הטבלה (שורה ~227)
<TableHead className="text-right">תנאי תשלום</TableHead>

// הוספה לשורות (אחרי Status, שורה ~344)
<TableCell>
  <span className="text-sm">
    {getPaymentTermLabel(proposal.conditions_json?.payment_term_type)}
  </span>
</TableCell>
```

### 3. Proposal Detail Dialog (פרטי הצעה)

**קובץ:** `src/components/ProposalDetailDialog.tsx`

**בעיה:** חסרות אפשרויות תשלום חדשות (net_15, net_45, net_75, net_120)

**פתרון:** החלפת switch statement בפונקציית העזר המרכזית

לפני (שורות 1100-1106):
```tsx
{entrepreneurPaymentTerms.payment_term_type === 'net_30' && 'שוטף + 30'}
{entrepreneurPaymentTerms.payment_term_type === 'net_60' && 'שוטף + 60'}
{entrepreneurPaymentTerms.payment_term_type === 'net_90' && 'שוטף + 90'}
{entrepreneurPaymentTerms.payment_term_type === 'current' && 'שוטף'}
// ... missing options
```

אחרי:
```tsx
{getPaymentTermLabel(entrepreneurPaymentTerms.payment_term_type)}
```

### 4. PDF Generation

**קובץ:** `src/utils/generateProposalPDF.ts`

**בעיה:** תנאי תשלום מוצגים רק אם מוגדרים ב-conditions_json.payment_terms כטקסט חופשי

**פתרון:** הוספת תמיכה בשדה payment_term_type מובנה

```typescript
// עדכון interface (שורה ~22)
export interface ProposalPDFData {
  // ... existing fields
  conditions?: {
    payment_terms?: string;
    payment_term_type?: string; // NEW
    // ...
  };
}

// עדכון הרנדור (שורה ~156)
const paymentTermDisplay = data.conditions?.payment_term_type 
  ? getPaymentTermLabel(data.conditions.payment_term_type)
  : data.conditions?.payment_terms;

${paymentTermDisplay ? `<p style="..."><strong>תנאי תשלום:</strong> ${paymentTermDisplay}</p>` : ''}
```

### 5. עדכון קבצים קיימים לשימוש ב-Constants

| קובץ | שינוי |
|------|-------|
| `PaymentTermsTab.tsx` | החלפת `PAYMENT_TERM_OPTIONS` local ב-import |
| `ConsultantPaymentTerms.tsx` | החלפת SelectItems hardcoded ב-import |
| `NegotiationContext.tsx` | החלפת `paymentTermLabels` local ב-import |
| `RFPDetails.tsx` | החלפת `PAYMENT_TERM_LABELS` local ב-import |
| `useProposalSubmit.ts` | החלפת `paymentTermLabels` local ב-import |

---

## סיכום קבצים לעדכון

| # | קובץ | פעולה |
|---|------|-------|
| 1 | `src/constants/paymentTerms.ts` | **יצירה חדשה** - קובץ מרכזי |
| 2 | `src/components/ProposalApprovalDialog.tsx` | הוספת תצוגת תנאי תשלום |
| 3 | `src/components/ProposalComparisonTable.tsx` | הוספת עמודה |
| 4 | `src/components/ProposalDetailDialog.tsx` | שימוש בפונקציית עזר |
| 5 | `src/utils/generateProposalPDF.ts` | תמיכה ב-payment_term_type |
| 6 | `src/components/rfp/PaymentTermsTab.tsx` | refactor לשימוש ב-constants |
| 7 | `src/components/proposal/ConsultantPaymentTerms.tsx` | refactor |
| 8 | `src/components/negotiation/NegotiationContext.tsx` | refactor |
| 9 | `src/pages/RFPDetails.tsx` | refactor |
| 10 | `src/hooks/useProposalSubmit.ts` | refactor |

---

## וולידציה

### Frontend
- בדיקה שתנאי תשלום תמיד מוצגים ולא null/undefined
- Fallback ל-"לא צוין" במקרה של ערך חסר

### Backend
- הערך נשמר כבר בשדות הרלוונטיים (rfp_invites.structured_request, proposals.conditions_json)
- אין צורך בשינויי DB

---

## תוצאה צפויה

**לפני:**
- תנאי תשלום לא מופיעים בדיאלוג אישור הצעה
- תנאי תשלום לא מופיעים בטבלת השוואה
- הגדרות מפוזרות ב-6+ קבצים

**אחרי:**
- תנאי תשלום מוצגים **בבירור** בכל מסך רלוונטי
- Badge בולט עם הערך "שוטף + 30" וכו'
- קוד מרוכז וקל לתחזוקה
- אחידות מלאה בין כל המסכים והתפקידים


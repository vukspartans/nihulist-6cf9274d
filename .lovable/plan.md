

# סקירה: שלוש בעיות לתיקון

## 1. מייל ליועץ על בקשת תיקון הצעה - נכשל!

### הבעיה
בדיקת ה-`activity_log` מראה שמיילי משא ומתן **נכשלים** באופן עקבי:

```
action: "negotiation_request_email_failed"
error: "Objects are not valid as a React child (found: object with keys {$$typeof, type, key, ref, props, _owner, _store})"
```

### סיבת הכשל
בקובץ `layout.tsx` (שורה 39), נעשה שימוש ב-`React.Fragment` שלא עובד טוב בסביבת Deno:

```tsx
// בעייתי
{footer || (
  <React.Fragment>
    <Text>...</Text>
    <Text>...</Text>
  </React.Fragment>
)}
```

### הפתרון
החלפת `React.Fragment` בסינטקס JSX קצר `<>...</>`:

```tsx
// תקין
{footer || (
  <>
    <Text>...</Text>
    <Text>...</Text>
  </>
)}
```

---

## 2. הערת מע"מ (* ללא מע"מ) - מיושם!

### סטטוס: ✅ מיושם ב-6 מקומות

| קובץ | שורה | סטטוס |
|------|------|--------|
| `SubmitProposal.tsx` | 1156 | ✅ |
| `ConsultantFeeTable.tsx` | 361 | ✅ |
| `ProposalComparisonTable.tsx` | 413 | ✅ |
| `ProposalComparisonDialog.tsx` | 531 | ✅ |
| `ProposalApprovalDialog.tsx` | 386 | ✅ |
| `ProposalDetailDialog.tsx` | 835 | ✅ |

הערה: יש לוודא שה-PDF המיוצר כולל גם הוא את ההערה.

---

## 3. הרחבת תנאי תשלום - חסר!

### המצב הנוכחי
תנאי התשלום הקיימים (ליזם וליועץ):

```tsx
const PAYMENT_TERM_OPTIONS = [
  { value: 'current', label: 'שוטף' },
  { value: 'net_30', label: 'שוטף + 30' },
  { value: 'net_60', label: 'שוטף + 60' },
  { value: 'net_90', label: 'שוטף + 90' },
];
```

### הבקשה
להוסיף את האפשרויות:
- תשלום מיידי
- שוטף + 15
- שוטף + 45
- שוטף + 75
- שוטף + 120

### קבצים לעדכון

| # | קובץ | שינוי |
|---|------|-------|
| 1 | `src/types/rfpRequest.ts` | הרחבת `PaymentTermType` |
| 2 | `src/components/rfp/PaymentTermsTab.tsx` | הוספת אפשרויות לדרופדאון |
| 3 | `src/components/proposal/ConsultantPaymentTerms.tsx` | הוספת אפשרויות לדרופדאון |
| 4 | `src/components/ProposalDetailDialog.tsx` | הוספת תצוגת תנאים חדשים |
| 5 | `src/hooks/useProposalSubmit.ts` | עדכון הטיפוס |
| 6 | `src/components/negotiation/NegotiationContext.tsx` | עדכון תרגום Labels |

---

## שינויים לביצוע

### שינוי 1: תיקון React.Fragment בקובץ layout.tsx

בקובץ `supabase/functions/_shared/email-templates/layout.tsx` שורות 38-53:

**לפני:**
```tsx
<Section style={footerSection}>
  {footer || (
    <React.Fragment>
      <Text style={footerText}>
        צוות Billding...
      </Text>
      <Text style={footerText}>
        <Link href="https://billding.ai" style={footerLink}>
          billding.ai
        </Link>
        {' | '}
        <Link href="mailto:support@billding.ai" style={footerLink}>
          support@billding.ai
        </Link>
      </Text>
    </React.Fragment>
  )}
</Section>
```

**אחרי:**
```tsx
<Section style={footerSection}>
  {footer || (
    <>
      <Text style={footerText}>
        צוות Billding...
      </Text>
      <Text style={footerText}>
        <Link href="https://billding.ai" style={footerLink}>
          billding.ai
        </Link>
        {' | '}
        <Link href="mailto:support@billding.ai" style={footerLink}>
          support@billding.ai
        </Link>
      </Text>
    </>
  )}
</Section>
```

### שינוי 2: הרחבת PaymentTermType

בקובץ `src/types/rfpRequest.ts` שורה 48:

**לפני:**
```tsx
export type PaymentTermType = 'current' | 'net_30' | 'net_60' | 'net_90';
```

**אחרי:**
```tsx
export type PaymentTermType = 
  | 'immediate'  // תשלום מיידי
  | 'current'    // שוטף
  | 'net_15'     // שוטף + 15
  | 'net_30'     // שוטף + 30
  | 'net_45'     // שוטף + 45
  | 'net_60'     // שוטף + 60
  | 'net_75'     // שוטף + 75
  | 'net_90'     // שוטף + 90
  | 'net_120';   // שוטף + 120
```

### שינוי 3: עדכון PAYMENT_TERM_OPTIONS בכל הקבצים

בקובץ `PaymentTermsTab.tsx` שורות 21-26:

```tsx
const PAYMENT_TERM_OPTIONS: { value: PaymentTermType; label: string }[] = [
  { value: 'immediate', label: 'תשלום מיידי' },
  { value: 'current', label: 'שוטף' },
  { value: 'net_15', label: 'שוטף + 15' },
  { value: 'net_30', label: 'שוטף + 30' },
  { value: 'net_45', label: 'שוטף + 45' },
  { value: 'net_60', label: 'שוטף + 60' },
  { value: 'net_75', label: 'שוטף + 75' },
  { value: 'net_90', label: 'שוטף + 90' },
  { value: 'net_120', label: 'שוטף + 120' },
];
```

אותו עדכון גם ב:
- `ConsultantPaymentTerms.tsx` (SelectContent)
- `ProposalDetailDialog.tsx` (תצוגת תנאי תשלום)
- `NegotiationContext.tsx` (paymentTermLabels)
- `useProposalSubmit.ts` (טיפוס)

---

## סיכום

| # | בעיה | סטטוס | פעולה |
|---|------|--------|-------|
| 1 | מייל משא ומתן | ❌ נכשל | תיקון React.Fragment |
| 2 | הערת מע"מ | ✅ מיושם | לא נדרש |
| 3 | תנאי תשלום | ❌ חסר | הרחבת האפשרויות |

לאחר התיקונים יש **לבדוק** את שליחת המייל ולוודא שהיועץ מקבל התראה כשהיזם מבקש תיקון להצעה.


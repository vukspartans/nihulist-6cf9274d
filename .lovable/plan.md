
# תכנית: שינויים בפרופיל ארגון, ביטול ניתוח אוטומטי והוספת סימון "ללא מע"מ"

## סקירת השינויים המבוקשים

### 1️⃣ שינוי שדה "עיר" ל"כתובת" בפרופיל ארגון
### 2️⃣ ביטול ניתוח AI אוטומטי של קבצים (רק לפי בקשת משתמש)
### 3️⃣ הוספת סימון "* ללא מע"מ" בסיכומי הצעות מחיר

---

## שינוי 1: עיר → כתובת

### קבצים לעדכון

| קובץ | שינוי |
|------|-------|
| `src/components/OrganizationProfileTab.tsx` | Label: "עיר" → "כתובת", Placeholder: "תל אביב" → "הזן כתובת מלאה", Display label: "עיר" → "כתובת" |
| `src/pages/OrganizationOnboarding.tsx` | Label: "עיר" → "כתובת", Placeholder: "עיר הרישום" → "הזן כתובת מלאה" |

### מה לא ישתנה
- שם העמודה בדאטאבייס (`location`) - נשאר כפי שהוא
- הלוגיקה של שמירה/טעינה - נשארת זהה
- רק הטקסטים המוצגים למשתמש משתנים

---

## שינוי 2: ביטול ניתוח אוטומטי של קבצים

### מיקומים לשינוי

| קובץ | שינוי |
|------|-------|
| `src/components/ProjectFilesManager.tsx` | הסרת קריאה אוטומטית ל-`analyzeFile()` לאחר העלאת קבצים (שורות 139-142) |
| `src/pages/ProjectWizard.tsx` | הסרת קריאה אוטומטית ל-`analyze-project-file` לאחר יצירת פרויקט (שורות 338-351) |

### מה נשאר
- כפתור "נתח קובץ" ידני ב-`ProjectFilesManager` - **נשמר** (שורה 572)
- ניתוח AI לצורך scoring הצעות (`evaluate-proposals-batch`) - **נשמר** (זה "נדרש ליצירת קלט")
- ניתוח קבצי הצעה ב-`ProposalDetailDialog` - **נשאר ידני** (כפתור "נתח קובץ")

### שינוי נוסף
- הסרת ה-Toast "ניתוח AI מתבצע ברקע" ב-`ProjectWizard.tsx`

---

## שינוי 3: הוספת "* ללא מע"מ" בסיכומי הצעות

### עיקרון
- הוספת הערת שוליים בתחתית סיכום המחירים (לא ליד כל מספר)
- טקסט: `* כל המחירים ללא מע"מ`
- עיצוב: טקסט קטן, צבע muted, מיושר לימין

### קבצים לעדכון

#### יצירת הצעה (Vendor)
| קובץ | מיקום |
|------|-------|
| `src/pages/SubmitProposal.tsx` | מתחת לסיכום "סה"כ הצעה" (שורה ~1155) |
| `src/components/proposal/ConsultantFeeTable.tsx` | מתחת לשורת Grand Total בטבלה (שורה ~355) |

#### צפייה בהצעה (Entrepreneur)
| קובץ | מיקום |
|------|-------|
| `src/components/ProposalDetailDialog.tsx` | מתחת לכרטיס סיכום "סה״כ חובה/אופציונלי" (שורה ~835) |
| `src/components/ProposalApprovalDialog.tsx` | מתחת לסיכום "סה"כ לתשלום" בכותרת (שורה ~253) |
| `src/components/ProposalComparisonTable.tsx` | מתחת לטבלת השוואה מורחבת (שורה ~400) |
| `src/components/ProposalComparisonDialog.tsx` | מתחת לסיכומי "סה"כ חובה/אופציונלי" (שורה ~530) |
| `src/utils/generateProposalPDF.ts` | מתחת לטבלת שכר טרחה ב-PDF |

### דוגמת קוד
```tsx
{/* VAT Disclaimer */}
<p className="text-xs text-muted-foreground text-right mt-2">
  * כל המחירים ללא מע"מ
</p>
```

---

## סיכום קבצים לעדכון

| # | קובץ | סוג שינוי |
|---|------|-----------|
| 1 | `src/components/OrganizationProfileTab.tsx` | Label + Placeholder |
| 2 | `src/pages/OrganizationOnboarding.tsx` | Label + Placeholder |
| 3 | `src/components/ProjectFilesManager.tsx` | הסרת auto-analyze |
| 4 | `src/pages/ProjectWizard.tsx` | הסרת auto-analyze + toast |
| 5 | `src/pages/SubmitProposal.tsx` | VAT disclaimer |
| 6 | `src/components/proposal/ConsultantFeeTable.tsx` | VAT disclaimer |
| 7 | `src/components/ProposalDetailDialog.tsx` | VAT disclaimer |
| 8 | `src/components/ProposalApprovalDialog.tsx` | VAT disclaimer |
| 9 | `src/components/ProposalComparisonTable.tsx` | VAT disclaimer |
| 10 | `src/components/ProposalComparisonDialog.tsx` | VAT disclaimer |
| 11 | `src/utils/generateProposalPDF.ts` | VAT disclaimer |

---

## פרטים טכניים

### שינוי 1 - שדה כתובת
שינוי טקסטים בלבד:
- `OrganizationProfileTab.tsx` שורות 351, 354-355, 389
- `OrganizationOnboarding.tsx` שורות 397, 400

### שינוי 2 - ביטול auto-analyze
- `ProjectFilesManager.tsx`: הסרת שורות 139-142 (loop שקורא ל-analyzeFile)
- `ProjectWizard.tsx`: הסרת שורות 338-351 (toast + forEach שקורא ל-edge function)

### שינוי 3 - VAT disclaimer
הוספת אלמנט `<p>` עם הטקסט בכל מיקום רלוונטי, עם styling עקבי:
```tsx
<p className="text-xs text-muted-foreground text-right mt-2">
  * כל המחירים ללא מע"מ
</p>
```

### מבנה ויזואלי צפוי

```text
┌─────────────────────────────────┐
│ סה"כ חובה:        ₪50,000      │
│ סה"כ אופציונלי:    ₪10,000      │
│                                 │
│ * כל המחירים ללא מע"מ           │
└─────────────────────────────────┘
```

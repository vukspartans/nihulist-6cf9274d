

# תיקון: סדר כפתורים בפירוט שירותים

## הבעיה

בטאב פירוט שירותים (`ServiceDetailsTab.tsx`), כפתור "נקה" מופיע **מימין** לכפתור "טען תבנית" (ב-RTL), במקום משמאל כמו בטאבים האחרים.

## הסטנדרט (לפי FeeItemsTable)

בתוך ה-flex container, הסדר בקוד הוא:
1. `LoadTemplateButton` (ראשון בקוד = ימני ב-RTL = קרוב לכותרת)
2. כפתור "נקה" (שני בקוד = שמאלי ב-RTL)

## השינוי

**קובץ: `src/components/rfp/ServiceDetailsTab.tsx`**

להחליף את סדר הכפתורים בתוך ה-div שעוצר propagation, כך ש-`LoadTemplateButton` יופיע ראשון בקוד ו"נקה" אחריו -- בדיוק כמו ב-FeeItemsTable וב-PaymentTermsTab.




## תיקון RTL מלא + אופטימיזציית UX לדיאלוג פרטי משימה

### בעיות שזוהו בקוד:

1. **Labels לא מיושרים לימין** -- כל ה-Label components חסרים `text-right` (הם יורשים מהפרנט `dir="rtl"` אבל בפועל יש להם default text-align שלא תמיד מגיב נכון)
2. **TaskAssignment** -- חסר `dir="rtl"` ו-`text-right` על SelectTrigger ו-SelectContent
3. **TaskDependencySelector** -- ה-container הראשי חסר `dir="rtl"`, רשימת התלויות מסודרת LTR
4. **Date inputs** -- `type="date"` inputs לא מיושרים לימין
5. **Checkbox + Label** -- הסדר של checkbox ו-label הפוך ב-RTL (checkbox צריך להיות אחרי הטקסט)
6. **Footer buttons** -- `flex-row-reverse` כבר קיים אבל הסדר של הכפתורים בקוד צריך בדיקה
7. **Progress percentage** -- `justify-between` עובד אבל ה-`%` צריך להיות משמאל למספר
8. **Empty states** -- טקסט ריק בתגובות ובקבצים ממורכז במקום מיושר לימין

### שינויים מתוכננים:

#### 1. `TaskDetailDialog.tsx`
- הוספת `text-right` לכל ה-Labels (כולל labels של תאריכים)
- תיקון date inputs: הוספת `text-right` ו-`dir="ltr"` (כדי שהתאריך עצמו יוצג נכון אבל ה-field מיושר לימין)
- תיקון סדר Checkbox + Label: ב-RTL, ה-checkbox צריך להגיע **אחרי** הטקסט (מימין לשמאל: טקסט ← checkbox)
- הוספת `dir="rtl"` ל-Textarea של block_reason ו-notes
- שיפור ה-footer: שימוש ב-`flex gap-2 justify-start` (שב-RTL = ימין) עם כפתור ראשי ראשון
- אופטימיזציה: צמצום spacing מ-`space-y-3` ל-`space-y-2.5` בתוך הטופס
- הוספת separator ויזואלי בין קבוצות שדות (קו דק או background שונה לקבוצת התאריכים)

#### 2. `TaskAssignment.tsx`
- הוספת `dir="rtl"` ל-Select
- הוספת `text-right` ל-SelectTrigger
- הוספת `dir="rtl"` ל-SelectContent

#### 3. `TaskDependencySelector.tsx`
- הוספת `dir="rtl"` ל-container הראשי
- תיקון הסדר של dependency items: שם משימה + badge מימין, כפתור X משמאל

#### 4. `TaskCommentsSection.tsx`
- הוספת `text-right` לטקסט "אין תגובות עדיין"

#### 5. `TaskFilesSection.tsx`
- הוספת `text-right` לטקסט "אין קבצים מצורפים"
- תיקון סדר items ברשימת קבצים: icon ← שם ← metadata מימין, כפתורים משמאל

### סיכום קבצים

| קובץ | שינוי |
|------|-------|
| `TaskDetailDialog.tsx` | RTL על labels, date inputs, checkbox order, textarea dir, footer, spacing |
| `TaskAssignment.tsx` | הוספת dir="rtl" ו-text-right |
| `TaskDependencySelector.tsx` | הוספת dir="rtl" לcontainer |
| `TaskCommentsSection.tsx` | text-right על empty state |
| `TaskFilesSection.tsx` | text-right על empty state |


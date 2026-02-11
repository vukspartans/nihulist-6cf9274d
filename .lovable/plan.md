

## שיפור דיאלוג פרטי משימה -- RTL, תגובות counter, ועיצוב

### שינויים מתוכננים:

### 1. תגובות Tab -- counter בעיגול + RTL (`TaskDetailDialog.tsx`)
- הוספת `commentCount` state שיתעדכן מ-`TaskCommentsSection` (דרך callback prop)
- הצגת מספר תגובות בעיגול ליד לשונית "תגובות": `<span className="bg-primary text-primary-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{count}</span>`
- חילוף: שימוש ב-hook `useTaskComments` ישירות ב-dialog כדי לקבל את ה-count

### 2. תגובות -- יישור ימין מלא (`TaskCommentsSection.tsx`)
- הוספת `flex-row-reverse` על ה-input container (textarea + send button) כדי שכפתור השליחה יהיה בשמאל
- הוספת `text-right` על comment header (שם + badge + time)

### 3. סטטוס + שלב -- יישור ימין (`TaskDetailDialog.tsx`)
- הוספת `[&>span]:text-right` על SelectTrigger או שימוש ב-`justify-end` כדי שהטקסט הנבחר יהיה מיושר לימין
- בדיקת SelectValue alignment

### 4. תאריכים -- תיקון חיתוך (`TaskDetailDialog.tsx`)
- שינוי מ-`grid-cols-4` ל-`grid-cols-2` (2 שורות של 2 תאריכים) -- 4 שדות בשורה אחת צר מדי ב-`max-w-2xl`
- הגדלת ה-input height מ-`h-8` ל-`h-9`
- הגדלת label מ-`text-[10px]` ל-`text-xs`
- הסרת `text-right` מ-date inputs (לא רלוונטי ל-type="date") ושמירת `dir="ltr"` בלבד

### 5. התקדמות + אבן דרך -- עיצוב משופר (`TaskDetailDialog.tsx`)
- עטיפה ב-`bg-muted/30 rounded-md p-2.5` (כמו קבוצת התאריכים) ליצירת קבוצה ויזואלית
- שינוי layout: progress bar ברוחב מלא, אבן דרך checkbox מתחתיו בשורה נפרדת
- הוספת צבע לאחוז: ירוק מעל 70%, כתום 30-70%, אדום מתחת ל-30%

### 6. שיפורים כלליים (`TaskDetailDialog.tsx`)
- הוספת separator ויזואלי (border-t או spacing) בין קבוצות שדות
- שיפור ה-footer: הוספת `border-t` מעל כפתורי השמירה

### סיכום קבצים

| קובץ | שינוי |
|------|-------|
| `TaskDetailDialog.tsx` | comment count בלשונית, dates grid-cols-2, progress/milestone visual group, footer border, SelectValue alignment |
| `TaskCommentsSection.tsx` | export count + flex-row-reverse on input, text-right fixes |


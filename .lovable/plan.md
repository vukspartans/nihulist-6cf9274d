

## אופטימיזציית RTL ופריסה של דיאלוג פרטי משימה

### בעיות נוכחיות:

1. **סדר הלשוניות (Tabs)**: כרגע הסדר הוא פרטים → קבצים → תגובות
   - בעברית צריך להיות: פרטים (מימין) → תגובות (באמצע) → קבצים (משמאל)
   - ה-TabsList לא מוגדר כ-RTL, ולכן הוא מתהפך באופן לא צפוי

2. **TaskCommentsSection**:
   - ה-flex layout עם `justify-start` / `justify-end` הוא הפוך ל-RTL
   - בעברית: תגובות של המשתמש צריך להיות על הימין, אחרים על השמאל
   - ה-`mr-auto` על הזמן צריך להשתנות ל-`ml-auto` ב-RTL
   - input textarea אין `dir="rtl"` + `text-right`
   - הסדר של האלמנטים בראש הכרטיסייה (שם, badge, זמן, כפתור) צריך להיות רכוש RTL

3. **TaskFilesSection**:
   - ה-dropzone רגיל (לא RTL-specific, אבל יש מקום לשיפור)
   - רשימת קבצים: ה-flex layout צריך להיות `flex-row-reverse` או RTL-aware
   - הסדר של icon, filename, size/date, buttons צריך להיות מימין לשמאל
   - אין `dir="rtl"` + `text-right` על labels

### תוכנית התיקון:

#### 1. TaskDetailDialog.tsx:
- שינוי סדר TabsTriggers: פרטים → תגובות → קבצים (בהנחה שהם יתהפכו באופן טבעי ב-RTL)
- או: שימוש ב-`dir="rtl"` על TabsList עם `grid-cols-3` שיתהפך לסדר הנכון
- וודא `dir="rtl"` על DialogContent (כבר קיים)

#### 2. TaskCommentsSection.tsx:
- הוספת `dir="rtl"` לcontainer הראשי
- שינוי ה-logic: `isOwn ? 'justify-end' : 'justify-start'` (הפוך)
- שינוי `mr-auto` ל-`ml-auto` על הזמן
- Textarea: הוסף `dir="rtl"` + `text-right`
- סדר האלמנטים בראש: לשם, badge, זמן, כפתור - עשה FlexRow Reverse או סדר RTL-native
- קונטיינר התגובה עם padding/flex לעיצוב RTL

#### 3. TaskFilesSection.tsx:
- Dropzone: הוסף `dir="rtl"` + `text-right` לטקסטים
- רשימת קבצים: שינוי ה-flex layout ל-`flex-row-reverse` (כדי שה-icon יהיה משמאל, שם + מידע באמצע, buttons מימין)
- או: `flex` עם `justify-between` ו-align proper
- הוסף `text-right` על ה-filename ו-metadata

### שינויים מפורשים:

| קובץ | שינוי |
|------|-------|
| `TaskDetailDialog.tsx` | הוסף `dir="rtl"` ל-TabsList; בדוק סדר tabs (עשוי להתהפך אוטומטית עם RTL) |
| `TaskCommentsSection.tsx` | הוסף `dir="rtl"` לroot div; הפוך ה-justify logic; שנה `mr-auto` ל-`ml-auto`; הוסף RTL styles לtextarea ושם/badge/time |
| `TaskFilesSection.tsx` | הוסף RTL support בdropzone (text-right); שנה flex layout ברשימה לRTL-friendly (flex-row-reverse או flex עם direction); הוסף text-right |




## אופטימיזציית UX/UI ניהול משימות -- 4 שיפורים

### 1. TaskDetailDialog -- RTL מלא + צמצום גלילה

**בעיות נוכחיות:**
- הדיאלוג משתמש ב-`max-w-lg` (צר) עם `space-y-4` שגורם לגלילה מיותרת
- שדות תאריכים מתוכננים ובפועל תופסים 2 שורות נפרדות במקום אחת
- הערות + תיאור כל אחד בנפרד עם `rows={3}` -- מבזבז מקום
- אין `dir="rtl"` על Select של סטטוס ושלב
- אין `text-right` על SelectTrigger-ים
- Slider ב-RTL צריך `dir="ltr"` (כמו switch) כדי לעבוד נכון
- DialogFooter לא מיושר ל-RTL

**שינויים ב-`TaskDetailDialog.tsx`:**
- הרחבת הדיאלוג ל-`max-w-2xl` ושימוש ב-`!h-[85vh]` עם flex layout + ScrollArea (כמו ProposalApprovalDialog)
- קיפול 4 שדות תאריך לשורה אחת (grid-cols-4) עם labels מקוצרים
- מיזוג תיאור והערות לאזור אחד קומפקטי (`rows={2}`)
- הוספת `dir="rtl"` ו-`text-right` לכל Select/SelectTrigger
- עטיפת Slider ב-`dir="ltr"` 
- DialogFooter עם `flex-row-reverse` ל-RTL
- הזזת progress + milestone + assignment לשורה אופקית אחת
- TabsList עם עיצוב קומפקטי יותר

### 2. TaskManagementDashboard -- אופטימיזציית שטח

**בעיות נוכחיות:**
- `space-y-6` מרווח מדי בין אלמנטים
- LicensingTimeline תופס הרבה מקום אנכי
- TaskFilters בשורה נפרדת מה-project selector
- הכל עטוף ב-padding מיותר

**שינויים ב-`TaskManagementDashboard.tsx`:**
- צמצום ל-`space-y-3` 
- שילוב project selector + badge + filters בשורה אחת (flex-wrap)
- LicensingTimeline עם `p-3` במקום `p-4`
- הוספת summary row: מספר משימות לפי סטטוס (כרטיסי סטטוס קטנים)

### 3. ProjectTaskView -- ברירת מחדל טבלה + toggle לקנבן

**בעיות נוכחיות:**
- ברירת מחדל היא "כרטיסיות" (cards) -- צריך להתהפך לטבלה
- כפתורי toggle לא ברורים מספיק

**שינויים ב-`ProjectTaskView.tsx`:**
- `useState<'table' | 'cards'>('table')` -- ברירת מחדל טבלה
- Toggle buttons עם ToggleGroup (מהספרייה הקיימת) במקום שני כפתורים נפרדים
- שיפור תצוגת כרטיסיות: רווחים קטנים יותר (`gap-2`), padding מצומצם (`p-3`)

### 4. ProjectDetail > TaskBoard -- מעבר לטבלה + קנבן

**בעיות נוכחיות:**
- ProjectDetail (route `/projects/:id`) משתמש ב-`TaskBoard` שמציג רק קנבן
- ה-TaskBoard מביא את הנתונים שלו דרך `useProjectTasks` -- מנותק מהמבנה של `TaskManagementDashboard`
- אין אפשרות לראות טבלה בתוך הפרויקט

**שינויים ב-`TaskBoard.tsx`:**
- הוספת toggle בין תצוגת טבלה (ברירת מחדל) לקנבן
- תצוגת טבלה: שימוש ב-table component דומה ל-AllProjectsTaskTable (ללא עמודת "פרויקט")
- תצוגת קנבן: הקוד הקיים (DndContext + columns)
- הסרת הכרטיס העוטף (Card) -- ישירות תוכן כי כבר בתוך TabsContent
- עיצוב קומפקטי יותר: header עם title + badge + toggle + "הוסף משימה"

### 5. AllProjectsTaskTable -- שיפורים

**שינויים ב-`AllProjectsTaskTable.tsx`:**
- עמודת "פרויקט" תהיה מוסתרת כש-`onProjectClick` לא מועבר (כשמשתמשים בה בתוך פרויקט ספציפי)
- Progress bar יותר קומפקטי

---

### סיכום קבצים שישתנו

| קובץ | שינוי עיקרי |
|-------|-------------|
| `TaskDetailDialog.tsx` | RTL fixes, wider dialog, flex layout with ScrollArea, compact fields, 4 dates in one row |
| `TaskManagementDashboard.tsx` | Tighter spacing, inline filters, status summary |
| `ProjectTaskView.tsx` | Default to table, ToggleGroup, tighter spacing |
| `TaskBoard.tsx` | Add table/kanban toggle, default table, remove Card wrapper |
| `AllProjectsTaskTable.tsx` | Conditional project column, compact progress |
| `LicensingTimeline.tsx` | Tighter padding (p-3) |


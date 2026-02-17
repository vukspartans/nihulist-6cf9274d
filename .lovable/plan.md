
# תוכנית: תיקון RTL בדרופדאון + הוספת סטטיסטיקות חדשות לדשבורד

## 1. תיקון RTL בדרופדאון "שלב בפרויקט"

**קובץ: `src/components/tasks/CreateTaskDialog.tsx`**

ל-`Select` חסר `dir="rtl"`, ול-`SelectTrigger` חסר `className="text-right"`. התיקון:
- הוספת `dir="rtl"` לקומפוננטת `Select`
- הוספת `className="text-right"` ל-`SelectTrigger`
- הוספת `dir="rtl"` ל-`SelectContent`

## 2. הוספת 3 כרטיסי סטטיסטיקה חדשים לדשבורד

**קובץ: `src/components/DashboardStats.tsx`**

הרחבת ה-grid מ-4 כרטיסים ל-7 (שורה שנייה עם 3 כרטיסים חדשים):

| כרטיס | מקור נתונים | אייקון |
|--------|-------------|--------|
| תשלומים לטיפול | `payment_requests` בסטטוסים שאינם `paid`/`rejected` עבור פרויקטים של המשתמש | `Coins` |
| משימות | סה"כ משימות פתוחות (כבר קיים ב-`useOpenTaskCounts`) | `ClipboardList` |
| משימות באיחור | משימות בסטטוס `delayed` או שעברו `planned_end_date` + אחוז מסה"כ | `AlertCircle` |

### שינויים טכניים:

1. **הרחבת `fetchStats`**: הוספת 2 שאילתות נוספות ב-`Promise.all`:
   - `payment_requests` עם join ל-`payment_milestones.project_id` כדי לסנן לפי פרויקטי המשתמש, ספירת רשומות שאינן `paid`/`rejected`
   - `project_tasks` עם סטטוס `delayed` או `planned_end_date < now` וסטטוס לא `completed`/`cancelled`
   - `project_tasks` סה"כ פתוחות (לא `completed`/`cancelled`)

2. **הרחבת ה-state**: הוספת `pendingPayments`, `totalTasks`, `delayedTasks`

3. **הרחבת ה-grid**: שורה שנייה עם 3 כרטיסים חדשים. כרטיס "משימות באיחור" יציג מתחת למספר את האחוז מסה"כ המשימות (למשל: `3 מתוך 20 (15%)`)

4. **עיצוב Grid**: `grid-cols-2 lg:grid-cols-4` בשורה ראשונה (כמו היום), שורה שנייה `grid-cols-3` לשלושת הכרטיסים החדשים

## קבצים שישתנו

| קובץ | שינוי |
|-------|-------|
| `src/components/tasks/CreateTaskDialog.tsx` | הוספת `dir="rtl"` ו-`text-right` לדרופדאון |
| `src/components/DashboardStats.tsx` | הוספת 3 כרטיסי סטטיסטיקה + שאילתות נתונים |



## ניתוח פערים -- מה בוצע ומה עדיין חסר

### סיכום מהיר

| סעיף | דרישה | סטטוס |
|-------|--------|--------|
| 3.1 | הגדרת משימה (שדות בסיסיים) | Done (רוב השדות) |
| 3.1 | שיוך אוטומטי למיילים | Not done |
| 3.2 | תבניות משימות + auto-load | Done |
| 3.2 | התאמה אישית (זכירת שינויים של יזם) | Not done |
| 3.2 | קישור אוטומטי ליועצים לפי תבנית | Partial |
| 3.3 | בקרת עריכה -- יזם: שליטה מלאה | Done |
| 3.3 | בקרת עריכה -- יועץ: אישור יזם לפני שמירה | Not done |
| 3.3 | התראה למחיקת משימה קריטית | Not done |
| 4.1 | סינון כלל הפרויקטים / פרויקט מסוים | Done |
| 4.2 | תצוגת כלל הפרויקטים -- ציר זמן + טבלה | Done |
| 4.3 | תצוגת פר-פרויקט -- טבלה + כרטיסיות | Done |
| 4.4 | ציר הזמן -- מיקום קבוע, חזותי | Done |
| 4.5 | תצוגת יועץ -- משימות | **Not done** |
| 5.1 | הרשאות בתוך משרד יועץ (מנהל/עובד) | Not done |
| 5.2 | שמירת אנשי קשר + CC | Not done |
| 5.2 | שיוך אוטומטי לפי תחום אחריות | Not done |
| 6.1 | שיוך אבן דרך אוטומטי + חישוב תזרים | Partial (payment milestones exist, auto-calc not done) |
| 6.1 | השפעת שינוי תאריך על צפי תשלומים | Not done |
| 6.2 | הגשת חשבונות -- התראה ליועץ | Not done |
| 6.2 | גמישות חשבון -- מספר אבני דרך | Partial (UI exists) |
| 6.3 | נוטיפיקיישן ליד פרויקט (מס' משימות) | Not done |
| 3.4 | תלות בין משימות | Done |

---

### הצעד הבא המומלץ: תצוגת משימות ליועץ (סעיף 4.5)

זו הדרישה הגדולה ביותר שעדיין לא מומשה ויש לה ערך גבוה כי היועצים כרגע **לא רואים משימות כלל** בדשבורד שלהם.

#### מה צריך לבנות:

1. **לשונית "משימות" בדשבורד היועץ** (`AdvisorDashboard.tsx`)
   - הוספת tab חדש "משימות" ליד ה-tabs הקיימים (rfp-invites, my-proposals, negotiations)
   - הצגת badge עם מספר משימות פתוחות

2. **Hook חדש: `useAdvisorTasks.ts`**
   - שאילתה ל-`project_tasks` עם `assigned_advisor_id` = advisor.id
   - join ל-projects לקבלת שם פרויקט
   - תמיכה בסינון: כלל הפרויקטים / פרויקט מסוים / סטטוס

3. **תצוגת "כלל הפרויקטים" ליועץ**
   - טבלה רוחבית של כל המשימות מכל הפרויקטים (שימוש חוזר ב-`AllProjectsTaskTable`)
   - סינון: אחריות, שם פרויקט, יזם, דדליין
   - ציר זמן עליון עם שלבי רישוי

4. **תצוגת "פר פרויקט" ליועץ**
   - ציר הזמן המלא של שלבי הרישוי
   - רק המשימות של היועץ בפרויקט הנבחר
   - ללא אפשרות עריכה/מחיקה (רק צפייה + עדכון סטטוס בכפוף לאישור יזם -- שלב עתידי)

#### קבצים חדשים:
- `src/hooks/useAdvisorTasks.ts` -- hook לשליפת משימות יועץ
- `src/components/tasks/AdvisorTasksView.tsx` -- קומפוננטה ראשית לתצוגת משימות יועץ

#### קבצים לעדכון:
- `src/pages/AdvisorDashboard.tsx` -- הוספת tab "משימות"
- `src/components/tasks/AllProjectsTaskTable.tsx` -- שימוש חוזר (ללא שינוי)
- `src/components/tasks/LicensingTimeline.tsx` -- שימוש חוזר (ללא שינוי)

#### פרטים טכניים:

**`useAdvisorTasks.ts`:**
```text
- Query: project_tasks WHERE assigned_advisor_id = advisorId
- Joins: projects(name, phase, type), profiles(name) for entrepreneur name
- Filters: projectId, status[], search text
- Returns: tasks, projects list, loading, filters, openCount
```

**`AdvisorTasksView.tsx`:**
```text
- Project selector (all / specific)
- LicensingTimeline at top
- TaskFilters for status/project filtering
- AllProjectsTaskTable for display
- TaskDetailDialog for viewing task details (read-only mode initially)
```

**`AdvisorDashboard.tsx` changes:**
```text
- Add "משימות" tab with open task count badge
- Render AdvisorTasksView inside the new tab
- Pass advisorId to the component
```


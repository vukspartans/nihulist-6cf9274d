

## שיפור קנבן + ויזואליזציה של תלויות ואיחורים

### מצב נוכחי:

**קנבן:**
- 5 עמודות (ממתין, בביצוע, באיחור, חסום, הושלם) ב-`grid-cols-4` -- כלומר עמודה אחת נדחקת לשורה שניה
- עמודות ללא רקע -- אין הפרדה ויזואלית ברורה בין עמודות
- TaskCard מציג: שם, תיאור, סטטוס badge, תאריך, יועץ, progress -- אבל **לא מציג תלויות**
- אין אינדיקציה ויזואלית לתלויות (למשל אייקון שרשרת או מספר תלויות)
- הכרטיסים לא RTL-optimized (flex direction)

**טבלה:**
- מציגה באיחור עם רקע אדום + badge "באיחור" -- עובד טוב
- **לא מציגה תלויות כלל** -- אין עמודה או אינדיקציה
- אין אייקון אבן דרך

### שינויים מתוכננים:

#### 1. קנבן -- עיצוב sleeker (`TaskBoard.tsx`, `DroppableColumn.tsx`)
- שינוי grid ל-`lg:grid-cols-5` (5 עמודות בשורה אחת)
- הוספת רקע עדין לכל עמודה: `bg-muted/20 rounded-xl p-3` למראה מודרני
- הוספת צבע header לכל עמודה (פס צבעוני עליון) לפי סוג: אפור/כחול/כתום/אדום/ירוק
- צמצום gap ל-`gap-2` ו-padding פנימי ל-`p-2`

#### 2. TaskCard -- sleeker + תלויות + RTL (`TaskCard.tsx`)
- הוספת `dir="rtl"` לכרטיס
- הוספת אינדיקציית תלויות: אם למשימה יש תלויות לא גמורות, מציג אייקון Link + "X תלויות"
- לשם כך: הוספת prop `dependencyCount?: number` ו-`hasBlockingDeps?: boolean`
- עיצוב sleeker: הקטנת padding ל-`p-2.5`, הוספת left-border צבעוני לפי סטטוס, הסרת TaskStatusBadge מהכרטיס (כי העמודה כבר מציינת את הסטטוס)
- הוספת אייקון Milestone (Flag) אם `is_milestone`
- שיפור overdue: רקע `bg-red-50` + border שמאלי אדום

#### 3. טבלה -- תלויות + אבן דרך (`AllProjectsTaskTable.tsx`)
- הוספת עמודה "תלויות" עם אייקון Link + מספר (או "—" אם אין)
- הוספת אייקון Flag ליד שם המשימה אם `is_milestone`
- לשם כך: הרחבת `ProjectTaskWithDetails` עם `dependency_count` ו-`has_blocking_deps`

#### 4. נתוני תלויות (`TaskBoard.tsx` / `useProjectTasks.ts`)
- הוספת שאילתה מרוכזת לספור תלויות לכל המשימות בפרויקט (שאילתת count על `task_dependencies`)
- העברת המידע ל-TaskCard ול-AllProjectsTaskTable

#### 5. DroppableColumn -- שיפור ויזואלי (`DroppableColumn.tsx`)
- הוספת prop `accentColor` לפס צבעוני עליון
- שיפור ה-empty state עם אייקון קטן

### סיכום קבצים

| קובץ | שינוי |
|------|-------|
| `TaskBoard.tsx` | grid-cols-5, fetch dependency counts, pass to cards/table |
| `DroppableColumn.tsx` | רקע עדין, פס צבעוני, עיצוב מודרני |
| `TaskCard.tsx` | dir="rtl", dependency indicator, colored left border, sleeker padding, milestone icon |
| `AllProjectsTaskTable.tsx` | עמודת תלויות, אייקון milestone, dependency data |
| `useProjectTasks.ts` | הוספת fetch dependency counts per task |
| `DraggableTaskCard.tsx` | העברת props חדשים (dependencyCount, hasBlockingDeps) |


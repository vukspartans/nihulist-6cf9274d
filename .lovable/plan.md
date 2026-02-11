

## שלושה שיפורים לניהול משימות ביזם

### 1. לחיצה על שם משימה פותחת את הדיאלוג

כרגע שם המשימה בטבלה (`AllProjectsTaskTable`) וכרטיסיות (`ProjectTaskView`) הוא טקסט סטטי. נהפוך אותו ללחיץ כדי לפתוח את `TaskDetailDialog`.

**שינויים:**

- **`AllProjectsTaskTable.tsx`** -- נוסיף prop `onTaskClick(taskId)` ונעטוף את שם המשימה ב-`<button>` עם סגנון link (כמו שם הפרויקט כבר עובד).
- **`ProjectTaskView.tsx`** -- אותו דבר בתצוגת כרטיסיות -- לחיצה על הכרטיסייה או על שם המשימה תפתח את הדיאלוג.
- **`TaskManagementDashboard.tsx`** -- נוסיף state של `selectedTask` ו-`TaskDetailDialog`, נעביר את ה-callback ל-`AllProjectsTaskTable` ול-`ProjectTaskView`. נצטרך גם לטעון את ה-`projectAdvisors` עבור הפרויקט של המשימה הנבחרת.
- **`useAllProjectsTasks.ts`** -- נוסיף מידע נוסף לכל משימה (`description`, `notes`, `is_blocked`, `block_reason`, `stage_id`, `template_id`, `duration_days`) כדי שה-dialog יקבל אובייקט `ProjectTask` מלא.

### 2. הקפצת משימות באיחור (Bump delayed tasks)

משימות בסטטוס `delayed` או שעברו את `planned_end_date` יקבלו עדיפות גבוהה בתצוגה.

**שינויים:**

- **`AllProjectsTaskTable.tsx`** -- שינוי ברירת מחדל של המיון: קודם כל `delayed` ומשימות שעבר תאריך היעד שלהן (חישוב דינמי), אח"כ לפי `planned_end_date`. שורות של משימות באיחור יקבלו רקע אדום בהיר (`bg-red-50`) ו-badge "באיחור" אם `planned_end_date < today` גם בלי סטטוס `delayed`.
- **`ProjectTaskView.tsx`** -- בתצוגת כרטיסיות, משימות באיחור יופיעו ראשונות בתוך כל שלב עם גבול אדום (`border-red-400`).

### 3. טעינת משימות אוטומטית מתבנית לפי פרויקט

כשנכנסים לפרויקט שאין לו משימות, המערכת תציע לטעון תבנית מותאמת לפי השילוב של: `project.type` + `project.phase` + `project.municipality_id`.

**שינויים:**

- **Hook חדש: `src/hooks/useAutoTaskLoader.ts`** -- Hook שמקבל `projectId` ובודק:
  1. האם לפרויקט יש כבר משימות (אם כן, לא עושה כלום)
  2. שולף את `type`, `phase`, `municipality_id` של הפרויקט
  3. שולף תבניות מ-`task_templates` עם סינון: `project_type = type` AND (אם `municipality_id` קיים -- `municipality_id = X`, אחרת fallback ל-`municipality_id IS NULL`) AND `is_active = true`
  4. מסנן תבניות לפי `licensing_phase_id` -- רק משלבים שהם מהשלב הנוכחי (`phase`) ואילך (לפי סדר ב-`PROJECT_PHASES`)
  5. מחזיר `{ templates, shouldSuggest, loadTasks() }`

- **קומפוננטה חדשה: `src/components/tasks/AutoTaskSuggestionBanner.tsx`** -- באנר שמוצג כש-`shouldSuggest = true`:
  - הודעה: "מצאנו X משימות מומלצות לפרויקט מסוג [type] בשלב [phase]"
  - כפתור "טען משימות" שמפעיל `loadTasks()` (משתמש ב-`useBulkTaskCreation` הקיים)
  - כפתור "לא עכשיו" שמסתיר את הבאנר

- **`TaskManagementDashboard.tsx`** -- כשנבחר פרויקט ספציפי, נציג את ה-`AutoTaskSuggestionBanner` מעל ה-`ProjectTaskView` (רק אם אין משימות עדיין).

- **`ProjectTaskView.tsx`** -- ה-banner יוצג גם ב-empty state (כשאין משימות) במקום ההודעה הגנרית.

**חשוב:** כרגע אין תבניות בטבלת `task_templates` (היא ריקה). המנגנון ייבנה מוכן אבל יעבוד רק אחרי שהאדמין ימלא תבניות. ה-banner לא יוצג אם אין תבניות מתאימות.

---

### פירוט טכני

#### קבצים חדשים
| קובץ | תיאור |
|-------|--------|
| `src/hooks/useAutoTaskLoader.ts` | טעינת תבניות מותאמות לפרויקט, סינון לפי שלב, הצעה ליצירה |
| `src/components/tasks/AutoTaskSuggestionBanner.tsx` | באנר עם הודעה וכפתורי "טען" / "לא עכשיו" |

#### קבצים שישתנו
| קובץ | שינוי |
|-------|-------|
| `AllProjectsTaskTable.tsx` | prop `onTaskClick`, מיון delayed-first, הדגשת שורות באיחור |
| `ProjectTaskView.tsx` | prop `onTaskClick`, משימות באיחור ראשונות עם גבול אדום, banner |
| `TaskManagementDashboard.tsx` | state ל-TaskDetailDialog, AutoTaskSuggestionBanner, callback-ים |
| `useAllProjectsTasks.ts` | שדות נוספים ב-ProjectTaskWithDetails |


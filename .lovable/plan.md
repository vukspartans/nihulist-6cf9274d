

## מסמכים מצורפים ותגובות פנימיות למשימות (דרישה 3.1)

### סקירה

נוסיף שתי יכולות חדשות לדיאלוג פרטי המשימה (`TaskDetailDialog`):
1. **צירוף קבצים** -- העלאה, צפייה והורדה של מסמכים
2. **תגובות/עדכונים פנימיים** -- היסטוריית שיחה בין יזם ויועצים

### שינויי מסד נתונים

#### טבלה חדשה: `task_comments`

| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | uuid PK | מזהה |
| task_id | uuid FK -> project_tasks | משימה |
| author_id | uuid | מזהה המשתמש |
| author_name | text | שם המחבר (שמור לתצוגה) |
| author_role | text | תפקיד: 'entrepreneur' / 'advisor' |
| content | text NOT NULL | תוכן התגובה |
| created_at | timestamptz | זמן יצירה |

RLS: authenticated users שהם בעלי הפרויקט או יועצים משויכים יכולים לקרוא ולכתוב.

#### טבלה חדשה: `task_files`

| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | uuid PK | מזהה |
| task_id | uuid FK -> project_tasks | משימה |
| storage_path | text NOT NULL | נתיב ב-storage |
| original_name | text NOT NULL | שם מקורי |
| file_size | integer | גודל בבייטים |
| mime_type | text | סוג הקובץ |
| uploaded_by | uuid | מי העלה |
| uploaded_at | timestamptz | זמן העלאה |

RLS: זהה ל-task_comments.

#### Storage bucket חדש: `task-files`

Bucket ציבורי עם RLS policies לגישה מאומתת בלבד.

### קבצים חדשים

| קובץ | תיאור |
|-------|--------|
| `src/hooks/useTaskComments.ts` | Hook לטעינה, הוספה ומחיקת תגובות |
| `src/hooks/useTaskFiles.ts` | Hook להעלאה, טעינה ומחיקת קבצים |
| `src/components/tasks/TaskCommentsSection.tsx` | רכיב תגובות: רשימת תגובות + textarea להוספה |
| `src/components/tasks/TaskFilesSection.tsx` | רכיב קבצים: אזור העלאה (dropzone) + רשימת קבצים עם הורדה/מחיקה |

### קבצים שישתנו

| קובץ | שינוי |
|-------|-------|
| `src/components/tasks/TaskDetailDialog.tsx` | הוספת Tabs עם 3 לשוניות: "פרטים", "קבצים", "תגובות" |
| `src/components/tasks/index.ts` | ייצוא הקומפוננטות החדשות |

### פירוט טכני

#### `useTaskComments.ts`
- `fetchComments()` -- שליפה מ-`task_comments` לפי `task_id`, מסודר לפי `created_at`
- `addComment(content)` -- הוספה עם `author_id` מה-session, `author_name` מה-profile, `author_role` לפי ה-role
- `deleteComment(id)` -- מחיקה (רק המחבר יכול למחוק)

#### `useTaskFiles.ts`
- `fetchFiles()` -- שליפה מ-`task_files` לפי `task_id`
- `uploadFile(file)` -- העלאה ל-bucket `task-files` בנתיב `{task_id}/{uuid}-{filename}`, שמירה בטבלה
- `deleteFile(id)` -- מחיקה מ-storage ומהטבלה
- `getSignedUrl(path)` -- קבלת URL חתום להורדה/צפייה

#### `TaskDetailDialog.tsx` -- שינוי מבנה
הדיאלוג יעבור ממבנה טופס אחד למבנה Tabs:
- **"פרטים"**: כל השדות הקיימים (שם, תיאור, סטטוס, תאריכים, תלויות וכו')
- **"קבצים"**: `TaskFilesSection` עם dropzone והרשימה
- **"תגובות"**: `TaskCommentsSection` עם היסטוריית שיחה ו-textarea

כפתור "שמור שינויים" יישאר בלשונית "פרטים" בלבד. קבצים ותגובות נשמרים מיידית.

#### `TaskCommentsSection.tsx` -- עיצוב
- רשימת תגובות מסודרת כרונולוגית (ישנות למעלה)
- כל תגובה: אווטאר/אייקון + שם + תפקיד (badge) + זמן + תוכן
- textarea בתחתית עם כפתור "שלח"
- תגובות של המשתמש הנוכחי מיושרות שמאלה, אחרים ימינה (סגנון צ'אט)

#### `TaskFilesSection.tsx` -- עיצוב
- אזור dropzone (דומה ל-FileUpload הקיים) עם הגבלה של 5 קבצים ו-20MB לקובץ
- רשימת קבצים עם: שם, גודל, תאריך העלאה, כפתורי הורדה ומחיקה
- פורמטים נתמכים: PDF, Word, Excel, תמונות, DWG, ZIP

### RLS Policies

```text
task_comments / task_files:
- SELECT: user is project owner OR user is assigned advisor on the project
- INSERT: same as SELECT (authenticated)
- DELETE: user is the uploader/author only
```

המימוש ישתמש ב-subquery על `projects.owner_id` ו-`project_advisors.advisor_id` -> `advisors.user_id` כדי לאמת הרשאות.

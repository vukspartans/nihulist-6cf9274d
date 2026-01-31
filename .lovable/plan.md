
# מערכת ניהול רישוי מתקדמת

## תיאור הדרישה

בניית מערכת ניהול רישוי מקיפה המבוססת על 3 מעגלים היררכיים:
1. **עירייה** (תל אביב, חיפה, אחר)
2. **סוג פרויקט** (תמ"א 38/1, תמ"א 38/2, משרדים וכו')
3. **שלב פרויקט** (בדיקה ראשונית, הגשת הצעה וכו') - כך שפרויקט בשלב מתקדם לא יכלול משימות של שלבים קודמים

משימות בסגנון גאנט עם:
- **היררכיה של רמות**: 1 > 1.1 > 1.1.1
- **תלויות בין משימות**: פעילויות קדם (Predecessors) כמו ב-MS Project

---

## מבנה מסד נתונים נדרש

### שינויים לטבלאות קיימות

#### 1. `task_templates` - הוספת עמודות

| עמודה חדשה | טיפוס | תיאור |
|------------|------|--------|
| `parent_template_id` | `uuid` | הפניה להורה ליצירת היררכיה 1 > 1.1 > 1.1.1 |
| `hierarchy_path` | `text` | נתיב היררכי (למשל: "001.002.001") לסידור נכון |
| `hierarchy_level` | `integer` | רמת עומק (1, 2, 3...) |
| `wbs_code` | `text` | קוד WBS לתצוגה ("1.1.1") |

#### 2. `project_tasks` - הוספת עמודות

| עמודה חדשה | טיפוס | תיאור |
|------------|------|--------|
| `parent_task_id` | `uuid` | הפניה למשימת אב |
| `hierarchy_path` | `text` | נתיב היררכי |
| `hierarchy_level` | `integer` | רמת עומק |
| `wbs_code` | `text` | קוד WBS לתצוגה |

#### 3. `task_dependencies` - הרחבה לתבניות

| עמודה חדשה | טיפוס | תיאור |
|------------|------|--------|
| `template_id` | `uuid` | לתלות בין תבניות |
| `depends_on_template_id` | `uuid` | תבנית שזו תלויה בה |

### טבלה חדשה: `template_dependencies`

```sql
CREATE TABLE template_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES task_templates(id) ON DELETE CASCADE,
  depends_on_template_id uuid REFERENCES task_templates(id) ON DELETE CASCADE,
  dependency_type text DEFAULT 'finish_to_start',
  lag_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, depends_on_template_id)
);
```

---

## ארכיטקטורת ה-UI

### מסך ניהול רישוי מנהל - 3 רמות ניווט

```text
+--------------------------------------------------+
|  ניהול רישוי                                      |
+--------------------------------------------------+
|                                                  |
|  [תל אביב]  [חיפה]  [ירושלים]  [+ הוסף עירייה]  |
|                                                  |
|  +-----------------------------------------+     |
|  |  תמ"א 38/1  |  תמ"א 38/2  |  משרדים     |     |
|  +-----------------------------------------+     |
|                                                  |
|  שלבי רישוי:                                     |
|  +-------------------------------------------+   |
|  | # | שלב              | משימות | פעולות    |   |
|  |---|------------------|--------|-----------|   |
|  | 1 | בדיקה ראשונית    | 5      | עריכה     |   |
|  | 2 | תכנון ראשוני     | 8      | עריכה     |   |
|  | 3 | הגשת בקשה        | 12     | עריכה     |   |
|  +-------------------------------------------+   |
|                                                  |
|  [לחיצה על שלב -> פתיחת עורך משימות היררכי]      |
+--------------------------------------------------+
```

### עורך משימות היררכי (סגנון גאנט)

```text
+---------------------------------------------------------------+
|  משימות - בדיקה ראשונית | תל אביב | תמ"א 38/2                  |
+---------------------------------------------------------------+
|                                                               |
|  WBS    | שם משימה              | משך | תלויות  | פעולות       |
|  -------|----------------------|-----|---------|-------------|
|  1      | סקירת מסמכים         | 3   | -       | ⬆⬇ ✏ 🗑     |
|    1.1  |   איסוף מסמכים       | 2   | -       | ⬆⬇ ✏ 🗑     |
|    1.2  |   בדיקת תקינות       | 1   | 1.1     | ⬆⬇ ✏ 🗑     |
|  2      | בדיקת התאמה לתב"ע    | 5   | 1       | ⬆⬇ ✏ 🗑     |
|    2.1  |   בדיקה מול תמ"א     | 3   | 2       | ⬆⬇ ✏ 🗑     |
|    2.2  |   בדיקת זכויות       | 2   | 2       | ⬆⬇ ✏ 🗑     |
|  3      | דוח ממצאים ראשוני    | 2   | 2.1,2.2 | ⬆⬇ ✏ 🗑     |
|                                                               |
|  [+ הוסף משימה]  [+ הוסף תת-משימה]  [📁 ייבוא]  [📤 ייצוא]     |
|                                                               |
+---------------------------------------------------------------+
```

---

## קומפוננטות חדשות

### 1. דף ראשי לניהול רישוי
**קובץ:** `src/pages/admin/LicensingManagement.tsx`

- כרטיסי עיריות עם ספירת פרויקטים ומשימות
- לחיצה על עירייה → ניווט לבחירת סוג פרויקט
- טאבים לסוגי פרויקטים
- תצוגת שלבים עם ספירת משימות

### 2. עורך משימות היררכי
**קובץ:** `src/components/admin/HierarchicalTaskEditor.tsx`

- טבלה עם הזחה ויזואלית לפי רמה
- Drag & Drop לשינוי סדר והיררכיה
- עריכה inline של משך ותלויות
- כפתורי הוספת משימה/תת-משימה

### 3. בורר תלויות
**קובץ:** `src/components/admin/DependencySelector.tsx`

- Multi-select עם תצוגת WBS
- סוגי תלויות: FS, SS, FF, SF
- הגדרת lag days

### 4. קומפוננטת WBS
**קובץ:** `src/components/admin/WBSCodeDisplay.tsx`

- תצוגה ויזואלית של קוד WBS
- אייקונים לפי רמה

---

## הוקס חדשים

### 1. `useHierarchicalTemplates`
```typescript
// טעינת תבניות עם היררכיה ותלויות
function useHierarchicalTemplates(
  municipalityId?: string,
  projectType?: string,
  licensingPhaseId?: string
)
```

### 2. `useTemplateDependencies`
```typescript
// ניהול תלויות בין תבניות
function useTemplateDependencies(templateId: string)
```

### 3. `useProjectTaskGeneration`
```typescript
// יצירת משימות מתבניות עם דילוג על שלבים קודמים
function useProjectTaskGeneration(
  projectId: string,
  startFromPhase: string
)
```

---

## לוגיקת דילוג על שלבים

כאשר יזם מגדיר פרויקט בשלב מתקדם (למשל "הגשת בקשה"):

```typescript
// פסאודו-קוד
const generateTasksFromPhase = async (
  projectId: string,
  municipalityId: string,
  projectType: string,
  startPhase: string
) => {
  // 1. קבלת כל השלבים מסודרים
  const phases = await getOrderedPhases(municipalityId, projectType);
  
  // 2. סינון - רק שלבים מהנבחר ומעלה
  const startIndex = phases.findIndex(p => p.name === startPhase);
  const relevantPhases = phases.slice(startIndex);
  
  // 3. טעינת תבניות משימות רק לשלבים הרלוונטיים
  const templates = await getTemplatesForPhases(relevantPhases.map(p => p.id));
  
  // 4. יצירת משימות עם שמירת היררכיה ותלויות
  return createProjectTasks(projectId, templates);
};
```

---

## קבצים לעדכון

| קובץ | שינוי |
|------|-------|
| `src/types/task.ts` | הוספת שדות היררכיה |
| `src/hooks/useTaskTemplatesAdmin.ts` | תמיכה בהיררכיה ותלויות |
| `src/hooks/useProjectTasks.ts` | טעינת משימות היררכיות |
| `src/components/admin/AdminLayout.tsx` | עדכון ניווט לדף החדש |

## קבצים חדשים

| קובץ | תיאור |
|------|-------|
| `src/pages/admin/LicensingManagement.tsx` | דף ראשי 3 מעגלים |
| `src/components/admin/HierarchicalTaskEditor.tsx` | עורך משימות היררכי |
| `src/components/admin/DependencySelector.tsx` | בורר תלויות |
| `src/components/admin/WBSDisplay.tsx` | תצוגת קוד WBS |
| `src/hooks/useHierarchicalTemplates.ts` | הוק לתבניות היררכיות |
| `src/hooks/useTemplateDependencies.ts` | הוק לתלויות |

---

## מיגרציות נדרשות

### מיגרציה 1: הוספת עמודות היררכיה

```sql
-- Add hierarchy columns to task_templates
ALTER TABLE task_templates 
ADD COLUMN parent_template_id uuid REFERENCES task_templates(id),
ADD COLUMN hierarchy_path text,
ADD COLUMN hierarchy_level integer DEFAULT 1,
ADD COLUMN wbs_code text;

-- Add hierarchy columns to project_tasks
ALTER TABLE project_tasks 
ADD COLUMN parent_task_id uuid REFERENCES project_tasks(id),
ADD COLUMN hierarchy_path text,
ADD COLUMN hierarchy_level integer DEFAULT 1,
ADD COLUMN wbs_code text;

-- Create index for hierarchy queries
CREATE INDEX idx_task_templates_hierarchy ON task_templates(hierarchy_path);
CREATE INDEX idx_project_tasks_hierarchy ON project_tasks(hierarchy_path);
```

### מיגרציה 2: יצירת טבלת תלויות תבניות

```sql
CREATE TABLE template_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  depends_on_template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'finish_to_start'
    CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, depends_on_template_id),
  CHECK (template_id != depends_on_template_id)
);

-- RLS
ALTER TABLE template_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template dependencies"
ON template_dependencies FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

---

## סדר מימוש מומלץ

| שלב | משימה | עדיפות |
|-----|--------|---------|
| 1 | מיגרציות DB להוספת עמודות | קריטי |
| 2 | עדכון טיפוסים ב-TypeScript | קריטי |
| 3 | דף LicensingManagement עם 3 מעגלים | גבוה |
| 4 | HierarchicalTaskEditor בסיסי | גבוה |
| 5 | DependencySelector | בינוני |
| 6 | לוגיקת דילוג שלבים ליזם | בינוני |
| 7 | Drag & Drop לשינוי היררכיה | נמוך |

---

## סיכום

המערכת תאפשר:
- ✅ בניית תבניות משימות לפי 3 מעגלים (עירייה → סוג פרויקט → שלב)
- ✅ היררכיה של משימות בסגנון WBS (1 > 1.1 > 1.1.1)
- ✅ הגדרת תלויות (Predecessors) כמו ב-MS Project
- ✅ דילוג אוטומטי על שלבים קודמים לפרויקטים מתקדמים
- ✅ עורך ויזואלי ידידותי למנהל

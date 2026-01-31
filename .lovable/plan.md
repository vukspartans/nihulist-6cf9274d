

# שירותים ואבני דרך בהיררכיית תבניות שכר טרחה

## סיכום הבקשה

הלקוח מבקש להוסיף **שירותים (Services)** ו**אבני דרך (Milestones)** לרמת **קטגוריית התבנית** (Level 3). המטרה: כל קטגוריה (כמו "הכנת מצגת לדיירים" או "רישוי") תכלול שירותים ואבני דרך ייחודיים לה.

---

## מצב נוכחי

| רכיב | מצב קיים |
|------|----------|
| `default_service_scope_templates` | מסונן לפי `advisor_specialty` בלבד |
| `milestone_templates` | מסונן לפי `advisor_specialty` ו-`project_type` |
| שיוך לקטגוריה | **לא קיים** |
| ממשק ניהול | דף נפרד (`RFPTemplatesManagement.tsx`) עם טאבים |

---

## פתרון מוצע

### עיקרון הפעולה

הממשק החדש ברמת **שיטת הגשה** (Level 4 - `FeeTemplateSubmissionMethods.tsx`) יכלול **3 טאבים**:
1. **שורות סעיפים** (Fee Line Items) - קיים
2. **שירותים** (Services) - חדש
3. **אבני דרך** (Milestones) - חדש

כל אחד מהטאבים יציג את התבניות המשויכות לקטגוריה הנוכחית.

---

## שינויי מסד נתונים

### 1. הוספת עמודות לטבלאות קיימות

```sql
-- Add category linkage to service scope templates
ALTER TABLE public.default_service_scope_templates
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fee_template_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_type TEXT;

-- Add category linkage to milestone templates  
ALTER TABLE public.milestone_templates
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fee_template_categories(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_service_scope_category ON public.default_service_scope_templates(category_id);
CREATE INDEX idx_milestone_template_category ON public.milestone_templates(category_id);
```

### 2. עדכון טיפוסים

**Types שיש לעדכן:**
- `ServiceScopeTemplate` - הוספת `category_id`, `project_type`
- `MilestoneTemplate` - הוספת `category_id`

---

## שינויי ממשק

### רמת שיטת הגשה (Level 4) - מבנה חדש

```
┌─────────────────────────────────────────────────────┐
│ ← חזרה │ אדריכל > תמ"א 38/2 > רישוי                 │
├─────────────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────┐            │
│ │ פאושלי ★  │  כמותי    │   שעתי    │  ← שיטות   │
│ └────────────┴────────────┴────────────┘            │
├─────────────────────────────────────────────────────┤
│ ┌──────────────┬────────────┬────────────┐          │
│ │ שורות סעיפים │  שירותים  │ אבני דרך  │  ← תוכן  │
│ └──────────────┴────────────┴────────────┘          │
├─────────────────────────────────────────────────────┤
│ │ טבלה/רשימה של התוכן הרלוונטי                    │ │
│ │ [+ הוסף פריט חדש]                               │ │
└─────────────────────────────────────────────────────┘
```

### לוגיקת הסינון

| טאב | מקור נתונים | סינון לפי |
|-----|-------------|-----------|
| שורות סעיפים | `default_fee_item_templates` | `submission_method_id` |
| שירותים | `default_service_scope_templates` | `category_id` |
| אבני דרך | `milestone_templates` | `category_id` |

---

## קבצים לעדכון

### קבצי מסד נתונים (1 חדש)
| קובץ | שינוי |
|------|-------|
| `supabase/migrations/xxx_add_category_to_services_milestones.sql` | הוספת עמודות `category_id` |

### קבצי טיפוסים (2 לעדכון)
| קובץ | שינוי |
|------|-------|
| `src/types/feeTemplateHierarchy.ts` | הוספת `ServiceScopeTemplateExtended`, `MilestoneTemplateExtended` |
| `src/integrations/supabase/types.ts` | יתעדכן אוטומטית עם המיגרציה |

### קבצי Hooks (2 לעדכון)
| קובץ | שינוי |
|------|-------|
| `src/hooks/useRFPTemplatesAdmin.ts` | הוספת סינון לפי `category_id` ל-Services |
| `src/hooks/useMilestoneTemplates.ts` | הוספת סינון לפי `category_id` |

### קבצי ממשק (2 לעדכון, 2 חדשים)
| קובץ | שינוי |
|------|-------|
| `src/pages/admin/FeeTemplateSubmissionMethods.tsx` | הוספת טאבים פנימיים (שורות/שירותים/אבני דרך) |
| `src/components/admin/CreateServiceScopeTemplateDialog.tsx` | הוספת `category_id` prop |
| `src/components/admin/CategoryServicesTab.tsx` | **חדש** - רכיב לניהול שירותים בקטגוריה |
| `src/components/admin/CategoryMilestonesTab.tsx` | **חדש** - רכיב לניהול אבני דרך בקטגוריה |

---

## סדר ביצוע

1. **מיגרציה** - הוספת עמודות `category_id` לטבלאות
2. **טיפוסים** - עדכון TypeScript interfaces
3. **Hooks** - הוספת סינון לפי `category_id`
4. **רכיבי טאב** - יצירת `CategoryServicesTab` ו-`CategoryMilestonesTab`
5. **עמוד Level 4** - עדכון `FeeTemplateSubmissionMethods` עם טאבים פנימיים
6. **דיאלוגים** - עדכון דיאלוגי יצירה לכלול `category_id`

---

## התנהגות ברירת מחדל ביצירת RFP

כאשר יזם יוצר RFP:
1. המערכת מזהה את **סוג היועץ** ו**סוג הפרויקט**
2. מחפשת **קטגוריה עם `is_default = true`**
3. אם נמצאה - טוענת את:
   - **שירותים** מ-`default_service_scope_templates` לפי `category_id`
   - **אבני דרך** מ-`milestone_templates` לפי `category_id`
   - **שורות סעיפים** מ-`default_fee_item_templates` לפי `submission_method_id` (מתוך שיטת ההגשה עם `is_default = true`)

---

## תאימות לאחור

- שירותים/אבני דרך קיימים ללא `category_id` ימשיכו לעבוד
- הסינון הקיים לפי `advisor_specialty` נשמר כ-fallback
- אפשרות לערוך שירותים/אבני דרך גם מהדף הישן (`RFPTemplatesManagement.tsx`)


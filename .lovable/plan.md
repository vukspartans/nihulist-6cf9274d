

# הוספת מדד (Index Type) לתבניות שכר טרחה

## סיכום הבקשה

הלקוח מבקש להוסיף **מדד הצמדה** לכל קטגוריית תבנית (Level 3 - `fee_template_categories`). המדד יקבע כיצד סכומים יוצמדו לאורך זמן.

### רשימת המדדים הנדרשים:
| מדד | קוד מוצע |
|-----|----------|
| ללא הצמדה | `none` |
| מדד המחירים לצרכן | `cpi` |
| מדד שכר העבודה בענף הבנייה | `construction_wage` |
| מדד עלות שעת עבודה | `hourly_labor_cost` |
| מדד תשומות הבנייה למגורים | `residential_construction_input` |
| מדד תשומות הבנייה שלא למגורים | `non_residential_construction_input` |

### התנהגות ברירת מחדל:
- לכל קטגוריית תבנית יש לבחור מדד ברירת מחדל
- ערך המדד הוא מדד החודש הנוכחי (לא מדד בסיס קבוע)

---

## מצב נוכחי

| רכיב | מצב |
|------|------|
| טבלת `fee_template_categories` | קיימת, ללא שדה מדד |
| בחירת מדד בקטגוריה | **לא קיים** |
| ממשק ניהול | קיים ב-`FeeTemplateCategories.tsx` |

---

## שינויים נדרשים

### 1. מסד נתונים - מיגרציה

```sql
-- Add index_type column to fee_template_categories
ALTER TABLE public.fee_template_categories
  ADD COLUMN IF NOT EXISTS default_index_type TEXT DEFAULT 'cpi';

-- Add constraint for valid index types
ALTER TABLE public.fee_template_categories
  ADD CONSTRAINT valid_index_type CHECK (
    default_index_type IN (
      'none',
      'cpi',
      'construction_wage',
      'hourly_labor_cost',
      'residential_construction_input',
      'non_residential_construction_input'
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN public.fee_template_categories.default_index_type IS 
  'Default index type for price linkage: none, cpi, construction_wage, hourly_labor_cost, residential_construction_input, non_residential_construction_input';
```

---

### 2. קבועים - קובץ חדש

**קובץ: `src/constants/indexTypes.ts`**

```typescript
export const INDEX_TYPES = [
  { value: 'none', label: 'ללא הצמדה' },
  { value: 'cpi', label: 'מדד המחירים לצרכן' },
  { value: 'construction_wage', label: 'מדד שכר העבודה בענף הבנייה' },
  { value: 'hourly_labor_cost', label: 'מדד עלות שעת עבודה' },
  { value: 'residential_construction_input', label: 'מדד תשומות הבנייה למגורים' },
  { value: 'non_residential_construction_input', label: 'מדד תשומות הבנייה שלא למגורים' },
] as const;

export type IndexType = typeof INDEX_TYPES[number]['value'];

export const DEFAULT_INDEX_TYPE: IndexType = 'cpi';
```

---

### 3. טיפוסים - עדכון

**קובץ: `src/types/feeTemplateHierarchy.ts`**

הוספת שדה לממשק:

```typescript
export interface FeeTemplateCategory {
  // ... existing fields
  default_index_type: 'none' | 'cpi' | 'construction_wage' | 'hourly_labor_cost' | 
                      'residential_construction_input' | 'non_residential_construction_input';
}

export interface CreateFeeCategoryInput {
  // ... existing fields
  default_index_type?: string;
}
```

---

### 4. ממשק - דף קטגוריות

**קובץ: `src/pages/admin/FeeTemplateCategories.tsx`**

הוספת תצוגת המדד בכרטיס הקטגוריה:

```
┌──────────────────────────────────────────────────────────────┐
│ רישוי                                  [ברירת מחדל ✓]      │
│ מדד: מדד המחירים לצרכן                                      │
│ לחץ לצפייה בשיטות הגשה                                      │
└──────────────────────────────────────────────────────────────┘
```

שינויים:
- הצגת סוג המדד מתחת לשם הקטגוריה
- כפתור עריכה לשינוי המדד

---

### 5. דיאלוג יצירת קטגוריה

**קובץ: `src/components/admin/CreateFeeCategoryDialog.tsx`**

הוספת שדה בחירת מדד:

```
┌──────────────────────────────────────┐
│ הוספת קטגוריה חדשה                   │
├──────────────────────────────────────┤
│ שם הקטגוריה                          │
│ [                                  ] │
│                                      │
│ מדד ברירת מחדל                       │
│ [ מדד המחירים לצרכן            ▼]   │
│                                      │
│ [○] הגדר כברירת מחדל                 │
│                                      │
│ [ביטול]              [צור קטגוריה]  │
└──────────────────────────────────────┘
```

---

### 6. דיאלוג עריכת קטגוריה (חדש)

**קובץ חדש: `src/components/admin/EditFeeCategoryDialog.tsx`**

דיאלוג לעריכת פרטי קטגוריה קיימת, כולל אפשרות לשנות את המדד.

---

## קבצים לשינוי/יצירה

| קובץ | פעולה | תיאור |
|------|-------|-------|
| `supabase/migrations/xxx_add_index_type.sql` | חדש | הוספת עמודה `default_index_type` |
| `src/constants/indexTypes.ts` | חדש | קבועי המדדים |
| `src/types/feeTemplateHierarchy.ts` | עדכון | הוספת שדה `default_index_type` |
| `src/pages/admin/FeeTemplateCategories.tsx` | עדכון | הצגת המדד + כפתור עריכה |
| `src/components/admin/CreateFeeCategoryDialog.tsx` | עדכון | הוספת בחירת מדד |
| `src/components/admin/EditFeeCategoryDialog.tsx` | חדש | דיאלוג עריכה |
| `src/hooks/useFeeTemplateHierarchy.ts` | עדכון | תמיכה בשדה החדש |

---

## סדר ביצוע

1. **מיגרציה** - הוספת עמודה `default_index_type` עם ברירת מחדל `cpi`
2. **קבועים** - יצירת `indexTypes.ts`
3. **טיפוסים** - עדכון interfaces
4. **דיאלוג יצירה** - הוספת Select למדד
5. **דיאלוג עריכה** - יצירת דיאלוג חדש
6. **דף קטגוריות** - הצגת המדד + כפתור עריכה

---

## שימוש במדד בעתיד

השדה `default_index_type` יהיה זמין לשימוש ב:
- הצעות מחיר - הצמדת סכומים לפי סוג המדד
- חוזים - סעיף הצמדה אוטומטי
- תשלומים - חישוב הפרשי הצמדה

הערך "מדד החודש הנוכחי" יחושב בזמן יצירת הצעה/חוזה לפי תאריך המסמך.


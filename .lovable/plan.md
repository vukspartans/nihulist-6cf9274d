

# תכנית: מחיקת אינדקס חוסם

## הבעיה המאומתת

אימות מלא של מצב הדאטאבייס מראה:

| אינדקס | הגדרה | סטטוס |
|--------|-------|--------|
| `project_advisors_pkey` | PRIMARY KEY (id) | ✅ תקין |
| `project_advisors_project_advisor_type_unique` | UNIQUE (project_id, advisor_id, advisor_type) | ✅ נוסף כנדרש |
| **`idx_project_advisors_project_advisor`** | **UNIQUE (project_id, advisor_id)** | ❌ **חוסם!** |

הפונקציה `approve_proposal_atomic` מעודכנת נכון, אבל האינדקס הישן גורם לPostgreSQL לדחות את הINSERT לפני שהON CONFLICT מופעל.

---

## הפתרון

מחיקת האינדקס הישן:

```sql
DROP INDEX IF EXISTS public.idx_project_advisors_project_advisor;
```

---

## שלבי ביצוע

1. יצירת migration חדש שמוחק את האינדקס
2. Migration יופעל אוטומטית על סביבת Test
3. **לחיצה על Publish** כדי להפעיל גם על Live
4. ניסיון מחודש לאשר את ההצעה

---

## פרטים טכניים

### סקריפט SQL מלא

```sql
-- Fix: Drop legacy unique index that blocks multi-service advisors
-- The previous migration dropped the constraint but this separate index 
-- still enforces UNIQUE (project_id, advisor_id), blocking approval of 
-- the same advisor for different service types
DROP INDEX IF EXISTS public.idx_project_advisors_project_advisor;
```

---

## לאחר התיקון

**חשוב:** לאחר אישור ה-migration יש ללחוץ על **Publish** כדי שהשינוי יופעל גם על סביבת ה-Live (הייצור), ואז לנסות שוב לאשר את ההצעה של א.א.ל.משכית.


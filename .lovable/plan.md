
# תכנית: תיקון אישור הצעות סבב שני (status: resubmitted)

## סיבת השגיאה

הפונקציה `approve_proposal_atomic` בדאטאבייס מאפשרת אישור רק להצעות עם `status = 'submitted'`:

```sql
-- שורה 36 בפונקציה הנוכחית
AND p.status = 'submitted'::proposal_status;
```

ההצעה של א.א.ל.משכית תכנון והנדסה היא **הצעה מעודכנת** (סבב שני) עם `status = 'resubmitted'`, ולכן הפונקציה מחזירה שגיאה.

---

## הפתרון

עדכון הפונקציה `approve_proposal_atomic` כך שתקבל גם הצעות עם סטטוס `resubmitted`:

### לפני
```sql
AND p.status = 'submitted'::proposal_status;
```

### אחרי
```sql
AND p.status IN ('submitted'::proposal_status, 'resubmitted'::proposal_status);
```

---

## קובץ לעדכון

| קובץ | שינוי |
|------|-------|
| **New Migration** | `ALTER FUNCTION` או `CREATE OR REPLACE FUNCTION` לעדכון `approve_proposal_atomic` |

---

## פרטים טכניים

### סקריפט SQL (Migration)
```sql
-- Fix: Allow approval of resubmitted proposals (second-round counter-offers)
CREATE OR REPLACE FUNCTION public.approve_proposal_atomic(
  p_proposal_id uuid,
  p_entrepreneur_notes text,
  p_signature_png text,
  p_signature_vector jsonb,
  p_content_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal RECORD;
  v_project_advisor_id UUID;
  v_signature_id UUID;
  v_user_profile RECORD;
  v_result JSONB;
BEGIN
  -- Get proposal details with ownership check
  -- FIX: Accept both 'submitted' AND 'resubmitted' statuses
  SELECT 
    p.id,
    p.project_id,
    p.advisor_id,
    p.price,
    p.timeline_days,
    proj.owner_id
  INTO v_proposal
  FROM public.proposals p
  JOIN public.projects proj ON proj.id = p.project_id
  WHERE p.id = p_proposal_id
  AND proj.owner_id = auth.uid()
  AND p.status IN ('submitted'::proposal_status, 'resubmitted'::proposal_status);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found, already approved, or access denied';
  END IF;

  -- Rest of function unchanged...
```

---

## אימות

לאחר העדכון, יש לבדוק:
1. התחברות כיזם `lior@narshaltd.com`
2. פתיחת פרויקט "וולפסון 12-18, חולון"
3. ניסיון לאשר את ההצעה המעודכנת של א.א.ל.משכית תכנון והנדסה
4. וידוא שהאישור עובר בהצלחה והיועץ נוסף לפרויקט

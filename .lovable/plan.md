

# תכנית: תמיכה ביועץ עם מספר שירותים לאותו פרויקט

## הבעיה

היועץ **א.א.ל.משכית תכנון והנדסה** כבר אושר לפרויקט עבור **יועץ אשפה**.
כעת היזם רוצה לאשר אותו גם עבור **יועץ אינסטלציה** - אבל הConstraint הקיים חוסם זאת:

```sql
UNIQUE (project_id, advisor_id)  -- לא מתחשב בסוג השירות!
```

---

## הפתרון

### שלב 1: הוספת עמודת `advisor_type` לטבלת `project_advisors`

```sql
ALTER TABLE project_advisors 
ADD COLUMN advisor_type TEXT;
```

### שלב 2: עדכון הנתונים הקיימים

מילוי `advisor_type` לרשומות קיימות מתוך ה-`rfp_invite` של ההצעה:

```sql
UPDATE project_advisors pa
SET advisor_type = ri.advisor_type
FROM proposals p
JOIN rfp_invites ri ON ri.id = p.rfp_invite_id
WHERE pa.proposal_id = p.id
  AND pa.advisor_type IS NULL;
```

### שלב 3: שינוי הUnique Constraint

```sql
-- הסרת הConstraint הישן
ALTER TABLE project_advisors 
DROP CONSTRAINT project_advisors_project_id_advisor_id_key;

-- יצירת Constraint חדש שכולל advisor_type
ALTER TABLE project_advisors 
ADD CONSTRAINT project_advisors_project_advisor_type_unique 
UNIQUE (project_id, advisor_id, advisor_type);
```

### שלב 4: עדכון פונקציית `approve_proposal_atomic`

הוספת שליפת `advisor_type` מה-`rfp_invite` והכנסתו ל-`project_advisors`:

```sql
-- בשליפת הproposal - הוספת JOIN ל-rfp_invites
SELECT 
  p.id,
  p.project_id,
  p.advisor_id,
  p.price,
  p.timeline_days,
  proj.owner_id,
  ri.advisor_type  -- חדש!
INTO v_proposal
FROM public.proposals p
JOIN public.projects proj ON proj.id = p.project_id
LEFT JOIN public.rfp_invites ri ON ri.id = p.rfp_invite_id
WHERE p.id = p_proposal_id
  AND proj.owner_id = auth.uid()
  AND p.status IN ('submitted', 'resubmitted');

-- בINSERT ל-project_advisors
INSERT INTO public.project_advisors (
  project_id, advisor_id, advisor_type, proposal_id, fee_amount, ...
)
VALUES (
  v_proposal.project_id,
  v_proposal.advisor_id,
  v_proposal.advisor_type,  -- חדש!
  p_proposal_id,
  v_proposal.price,
  ...
)
ON CONFLICT (project_id, advisor_id, advisor_type) 
DO UPDATE SET ...
```

---

## קבצים לעדכון

| # | קובץ | שינוי |
|---|------|-------|
| 1 | **New Migration** | הוספת עמודה, עדכון נתונים, שינוי constraint, עדכון פונקציה |

---

## תוצאה צפויה

לאחר התיקון, אותו יועץ יכול לספק מספר שירותים לאותו פרויקט:

| יועץ | סוג שירות | מחיר |
|------|-----------|------|
| א.א.ל.משכית | יועץ אשפה | ₪14,000 |
| א.א.ל.משכית | יועץ אינסטלציה | ₪70,004 |

---

## פרטים טכניים

### Migration מלא

```sql
-- 1. Add advisor_type column
ALTER TABLE project_advisors ADD COLUMN advisor_type TEXT;

-- 2. Backfill existing records from rfp_invites
UPDATE project_advisors pa
SET advisor_type = ri.advisor_type
FROM proposals p
JOIN rfp_invites ri ON ri.id = p.rfp_invite_id
WHERE pa.proposal_id = p.id
  AND pa.advisor_type IS NULL;

-- 3. Drop old constraint
ALTER TABLE project_advisors 
DROP CONSTRAINT IF EXISTS project_advisors_project_id_advisor_id_key;

-- 4. Add new constraint with advisor_type
ALTER TABLE project_advisors 
ADD CONSTRAINT project_advisors_project_advisor_type_unique 
UNIQUE (project_id, advisor_id, advisor_type);

-- 5. Update approve_proposal_atomic function (full function with changes)
CREATE OR REPLACE FUNCTION public.approve_proposal_atomic(...)
-- [See full function in implementation]
```


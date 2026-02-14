

# Seed Task Templates for All 13 Licensing Stages

## Current State

Only **4 out of 13** licensing phases exist in the database, so most stages show "no templates defined":

| Existing (4) | Missing (9) |
|---|---|
| בדיקה ראשונית | הגשת הצעה |
| תכנון ראשוני | בחתימות |
| הגשת בקשה להיתר | עמידה בתנאי סף |
| ביצוע | פרסום |
| | בקרה מרחבית |
| | דיון בוועדה |
| | מכון בקרה |
| | בקבלת היתר |
| | באישור תחילת עבודות |
| | הסתיים |

Note: "הגשת בקשה להיתר" exists but doesn't match any PROJECT_PHASE exactly -- it may need a review, but we'll keep it as-is since it has templates.

## Plan

A single database migration that:

### 1. Create the 9 missing licensing phases

Insert rows into `licensing_phases` for each missing stage, with proper `display_order` matching the PROJECT_PHASES sequence (1-13).

### 2. Update display_order on existing phases

Align the 4 existing phases to the correct position in the 13-stage sequence.

### 3. Seed 2-3 task templates per new phase

Each template will be for `project_type = 'מגורים'` (Residential), linked to its licensing phase, with realistic Hebrew task names relevant to that stage of a construction licensing project.

**Sample tasks per stage:**

| Stage | Tasks |
|---|---|
| הגשת הצעה | הכנת מסמכי הצעה, הגשת הצעת מחיר ליזם |
| בחתימות | איסוף חתימות דיירים, אימות חתימות נוטריוני |
| עמידה בתנאי סף | בדיקת עמידה בתנאי סף, השלמת מסמכים חסרים |
| פרסום | פרסום להתנגדויות, מעקב תקופת פרסום |
| בקרה מרחבית | הגשת תוכניות לבקרה מרחבית, תיקונים לפי הערות בקרה |
| דיון בוועדה | הכנת מצגת לוועדה, השתתפות בדיון ועדה, טיפול בתנאי ועדה |
| מכון בקרה | הגשת תוכניות למכון בקרה, תיקונים לפי הערות מכון |
| בקבלת היתר | קבלת היתר בנייה, רישום היתר ברשות |
| באישור תחילת עבודות | הגשת בקשה לאישור תחילת עבודות, מינוי קבלן ראשי |
| הסתיים | ביקורת סיום, הגשת מסמכי גמר |

## Technical Details

- One SQL migration file with `INSERT INTO licensing_phases` and `INSERT INTO task_templates`
- Each task template gets `is_active = true`, `is_default = true`, `project_type = 'מגורים'`
- `default_duration_days` set to realistic values (7-30 days depending on task)
- `display_order` sequential within each phase
- No code changes needed -- the existing `StageTaskLoadDialog` and `LoadTaskTemplatesDialog` will automatically pick up the new templates

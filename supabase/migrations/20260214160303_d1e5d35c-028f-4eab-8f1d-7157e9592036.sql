
-- Update display_order for existing phases to match PROJECT_PHASES sequence
UPDATE licensing_phases SET display_order = 1 WHERE id = 'f794952a-e7fc-4618-8e94-6421ea3c6372'; -- בדיקה ראשונית
UPDATE licensing_phases SET display_order = 3 WHERE id = '31002aa5-57f3-4b07-8af3-3a0c1c8b9d21'; -- תכנון ראשוני
UPDATE licensing_phases SET display_order = 11 WHERE id = '9073f1c1-a8ff-43a9-b57b-e47d2c6edb0e'; -- הגשת בקשה להיתר (keeping as-is)
UPDATE licensing_phases SET display_order = 12 WHERE id = '99a982b5-95bb-4e95-93ca-5cb0206337e5'; -- ביצוע

-- Insert 9 missing licensing phases
INSERT INTO licensing_phases (name, display_order, is_active) VALUES
  ('הגשת הצעה', 2, true),
  ('בחתימות', 4, true),
  ('עמידה בתנאי סף', 5, true),
  ('פרסום', 6, true),
  ('בקרה מרחבית', 7, true),
  ('דיון בוועדה', 8, true),
  ('מכון בקרה', 9, true),
  ('בקבלת היתר', 10, true),
  ('באישור תחילת עבודות', 11, true),
  ('הסתיים', 13, true);

-- Seed task templates for each new phase
-- We use CTEs to reference the newly inserted phase IDs

-- הגשת הצעה (display_order 2)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'הגשת הצעה', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('הכנת מסמכי הצעה', 10, 1),
  ('הגשת הצעת מחיר ליזם', 7, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'הגשת הצעה' AND lp.display_order = 2;

-- בחתימות (display_order 4)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'בחתימות', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('איסוף חתימות דיירים', 21, 1),
  ('אימות חתימות נוטריוני', 14, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'בחתימות' AND lp.display_order = 4;

-- עמידה בתנאי סף (display_order 5)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'עמידה בתנאי סף', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('בדיקת עמידה בתנאי סף', 14, 1),
  ('השלמת מסמכים חסרים', 10, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'עמידה בתנאי סף' AND lp.display_order = 5;

-- פרסום (display_order 6)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'פרסום', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('פרסום להתנגדויות', 30, 1),
  ('מעקב תקופת פרסום', 21, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'פרסום' AND lp.display_order = 6;

-- בקרה מרחבית (display_order 7)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'בקרה מרחבית', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('הגשת תוכניות לבקרה מרחבית', 14, 1),
  ('תיקונים לפי הערות בקרה', 10, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'בקרה מרחבית' AND lp.display_order = 7;

-- דיון בוועדה (display_order 8)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'דיון בוועדה', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('הכנת מצגת לוועדה', 10, 1),
  ('השתתפות בדיון ועדה', 7, 2),
  ('טיפול בתנאי ועדה', 14, 3)
) AS t(name, duration, ord)
WHERE lp.name = 'דיון בוועדה' AND lp.display_order = 8;

-- מכון בקרה (display_order 9)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'מכון בקרה', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('הגשת תוכניות למכון בקרה', 14, 1),
  ('תיקונים לפי הערות מכון', 10, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'מכון בקרה' AND lp.display_order = 9;

-- בקבלת היתר (display_order 10)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'בקבלת היתר', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('קבלת היתר בנייה', 7, 1),
  ('רישום היתר ברשות', 7, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'בקבלת היתר' AND lp.display_order = 10;

-- באישור תחילת עבודות (display_order 11)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'באישור תחילת עבודות', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('הגשת בקשה לאישור תחילת עבודות', 14, 1),
  ('מינוי קבלן ראשי', 10, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'באישור תחילת עבודות' AND lp.display_order = 11;

-- הסתיים (display_order 13)
INSERT INTO task_templates (name, project_type, phase, licensing_phase_id, default_duration_days, display_order, is_default, is_active)
SELECT t.name, 'מגורים', 'הסתיים', lp.id, t.duration, t.ord, true, true
FROM licensing_phases lp
CROSS JOIN (VALUES
  ('ביקורת סיום', 14, 1),
  ('הגשת מסמכי גמר', 10, 2)
) AS t(name, duration, ord)
WHERE lp.name = 'הסתיים' AND lp.display_order = 13;

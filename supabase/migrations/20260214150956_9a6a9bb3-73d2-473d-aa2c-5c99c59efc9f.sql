
-- First seed licensing phases for residential projects
INSERT INTO licensing_phases (name, description, display_order, project_type, is_active)
VALUES
  ('בדיקה ראשונית', 'בדיקות היתכנות וזכויות בנייה', 1, 'מגורים', true),
  ('תכנון ראשוני', 'הכנת תוכניות אדריכליות ותיאום יועצים', 2, 'מגורים', true),
  ('הגשת בקשה להיתר', 'הכנה והגשת מסמכים לוועדה המקומית', 3, 'מגורים', true),
  ('ביצוע', 'פיקוח וביצוע עבודות בנייה', 4, 'מגורים', true);

-- Seed task templates referencing the phases by name lookup
-- Phase: בדיקה ראשונית
INSERT INTO task_templates (project_type, name, description, default_duration_days, display_order, advisor_specialty, is_milestone, is_default, licensing_phase_id)
VALUES
  ('מגורים', 'בדיקת היתכנות תכנונית', 'בדיקת התאמת הפרויקט לתכנון העירוני והתב"ע', 14, 1, 'אדריכל', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'בדיקה ראשונית' AND project_type = 'מגורים' LIMIT 1)),
  ('מגורים', 'בדיקת זכויות בנייה', 'בדיקת זכויות בנייה קיימות ואפשרויות ניצול', 7, 2, 'אדריכל', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'בדיקה ראשונית' AND project_type = 'מגורים' LIMIT 1)),
  ('מגורים', 'סקר סביבתי ראשוני', 'ביצוע סקר סביבתי ראשוני לזיהוי מפגעים', 10, 3, 'יועץ סביבתי', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'בדיקה ראשונית' AND project_type = 'מגורים' LIMIT 1)),

-- Phase: תכנון ראשוני
  ('מגורים', 'הכנת תוכנית אדריכלית ראשונית', 'עיצוב ותכנון אדריכלי ראשוני של הפרויקט', 21, 4, 'אדריכל', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'תכנון ראשוני' AND project_type = 'מגורים' LIMIT 1)),
  ('מגורים', 'חישובי שטחים ראשוניים', 'חישוב שטחי בנייה, שטחים עיקריים ושטחי שירות', 7, 5, 'אדריכל', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'תכנון ראשוני' AND project_type = 'מגורים' LIMIT 1)),
  ('מגורים', 'תיאום יועצים ראשוני', 'תיאום בין כלל יועצי הפרויקט וקביעת לוחות זמנים', 5, 6, 'מנהל פרויקט', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'תכנון ראשוני' AND project_type = 'מגורים' LIMIT 1)),

-- Phase: הגשת בקשה להיתר
  ('מגורים', 'הכנת תיק בקשה להיתר', 'הכנת כל המסמכים הנדרשים לתיק ההיתר', 14, 7, 'אדריכל', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'הגשת בקשה להיתר' AND project_type = 'מגורים' LIMIT 1)),
  ('מגורים', 'הגשת מסמכים לוועדה', 'הגשה פיזית/דיגיטלית של המסמכים לוועדה המקומית', 3, 8, 'אדריכל', true, true,
    (SELECT id FROM licensing_phases WHERE name = 'הגשת בקשה להיתר' AND project_type = 'מגורים' LIMIT 1)),
  ('מגורים', 'תשלום אגרות', 'תשלום אגרות היתר בנייה והיטלים', 2, 9, 'יזם', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'הגשת בקשה להיתר' AND project_type = 'מגורים' LIMIT 1)),

-- Phase: ביצוע
  ('מגורים', 'פיקוח עליון', 'פיקוח עליון על ביצוע עבודות הבנייה', 90, 10, 'אדריכל', true, true,
    (SELECT id FROM licensing_phases WHERE name = 'ביצוע' AND project_type = 'מגורים' LIMIT 1)),
  ('מגורים', 'בדיקות בטון', 'ביצוע בדיקות בטון ודיגום בשלבי הבנייה', 14, 11, 'מהנדס', false, true,
    (SELECT id FROM licensing_phases WHERE name = 'ביצוע' AND project_type = 'מגורים' LIMIT 1));

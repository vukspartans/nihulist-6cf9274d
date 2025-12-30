
-- Fix existing template names to match ADVISOR_EXPERTISE
UPDATE default_fee_item_templates 
SET advisor_specialty = 'יועץ כבישים תנועה וחניה' 
WHERE advisor_specialty = 'יועץ תנועה';

UPDATE default_fee_item_templates 
SET advisor_specialty = 'יועץ קונסטרוקציה' 
WHERE advisor_specialty = 'מהנדס קונסטרוקציה';

-- Add templates for עורך דין מקרקעין
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, display_order, is_optional, charge_type) VALUES
('עורך דין מקרקעין', 'בדיקה משפטית מקדמית', 'פאושלי', 1, false, 'one_time'),
('עורך דין מקרקעין', 'ליווי עסקת רכישה/מכירה', 'פאושלי', 2, false, 'one_time'),
('עורך דין מקרקעין', 'הכנת חוזה מכר', 'פאושלי', 3, false, 'one_time'),
('עורך דין מקרקעין', 'רישום בטאבו', 'פאושלי', 4, false, 'one_time'),
('עורך דין מקרקעין', 'ייצוג מול רשויות תכנון', 'שעה', 5, true, 'hourly'),
('עורך דין מקרקעין', 'טיפול בהסכמי שכירות', 'פאושלי', 6, true, 'one_time');

-- Add templates for מפקח בנייה
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, display_order, is_optional, charge_type) VALUES
('מפקח בנייה', 'פיקוח עליון על הבנייה', 'חודש', 1, false, 'monthly'),
('מפקח בנייה', 'בדיקת איכות חומרים', 'ביקור', 2, false, 'per_unit'),
('מפקח בנייה', 'דוחות התקדמות', 'דוח', 3, false, 'per_unit'),
('מפקח בנייה', 'בדיקת תקינות מערכות', 'פאושלי', 4, false, 'one_time'),
('מפקח בנייה', 'ליווי מסירה', 'פאושלי', 5, true, 'one_time');

-- Add templates for ניהול פרויקטים
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, display_order, is_optional, charge_type) VALUES
('ניהול פרויקטים', 'ניהול פרויקט מלא', 'אחוז מעלות', 1, false, 'percentage'),
('ניהול פרויקטים', 'תכנון לוחות זמנים', 'פאושלי', 2, false, 'one_time'),
('ניהול פרויקטים', 'ניהול קבלנים', 'חודש', 3, false, 'monthly'),
('ניהול פרויקטים', 'בקרת תקציב', 'חודש', 4, false, 'monthly'),
('ניהול פרויקטים', 'ישיבות תיאום', 'ישיבה', 5, true, 'per_unit');

-- Add templates for יועץ נגישות
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, display_order, is_optional, charge_type) VALUES
('יועץ נגישות', 'חוות דעת נגישות', 'פאושלי', 1, false, 'one_time'),
('יועץ נגישות', 'ליווי תכנון נגישות', 'פאושלי', 2, false, 'one_time'),
('יועץ נגישות', 'בדיקת נגישות סופית', 'פאושלי', 3, false, 'one_time'),
('יועץ נגישות', 'אישור נגישות', 'פאושלי', 4, false, 'one_time');

-- Add templates for יועץ בטיחות אש
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, display_order, is_optional, charge_type) VALUES
('יועץ בטיחות אש', 'חוות דעת בטיחות אש', 'פאושלי', 1, false, 'one_time'),
('יועץ בטיחות אש', 'תכנון מערכות כיבוי', 'פאושלי', 2, false, 'one_time'),
('יועץ בטיחות אש', 'ליווי אישור כב"א', 'פאושלי', 3, false, 'one_time'),
('יועץ בטיחות אש', 'בדיקות תקופתיות', 'ביקור', 4, true, 'per_unit');

-- Add templates for מודד מוסמך
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, display_order, is_optional, charge_type) VALUES
('מודד מוסמך', 'מדידה טופוגרפית', 'דונם', 1, false, 'per_unit'),
('מודד מוסמך', 'תכנית מדידה להיתר', 'פאושלי', 2, false, 'one_time'),
('מודד מוסמך', 'סימון גבולות', 'פאושלי', 3, false, 'one_time'),
('מודד מוסמך', 'מפת מדידה לטאבו', 'פאושלי', 4, true, 'one_time');

-- Add templates for אדריכל נוף
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, display_order, is_optional, charge_type) VALUES
('אדריכל נוף', 'תכנון נופי', 'פאושלי', 1, false, 'one_time'),
('אדריכל נוף', 'תכנית שתילה', 'פאושלי', 2, false, 'one_time'),
('אדריכל נוף', 'פיקוח על ביצוע גינון', 'ביקור', 3, false, 'per_unit'),
('אדריכל נוף', 'תכנון מערכות השקיה', 'פאושלי', 4, true, 'one_time');

-- Add templates for יועץ מיזוג אוויר
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, display_order, is_optional, charge_type) VALUES
('יועץ מיזוג אוויר', 'תכנון מערכת מיזוג', 'פאושלי', 1, false, 'one_time'),
('יועץ מיזוג אוויר', 'חישובי עומסים', 'פאושלי', 2, false, 'one_time'),
('יועץ מיזוג אוויר', 'פיקוח על התקנה', 'ביקור', 3, false, 'per_unit'),
('יועץ מיזוג אוויר', 'אישור מערכות', 'פאושלי', 4, false, 'one_time');

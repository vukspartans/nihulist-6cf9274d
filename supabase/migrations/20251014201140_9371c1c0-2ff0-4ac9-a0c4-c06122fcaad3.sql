-- Update normalize_project_type function to handle the new category split
-- This ensures backward compatibility for any legacy data

CREATE OR REPLACE FUNCTION public.normalize_project_type(legacy_type text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
BEGIN
  -- Handle null or empty types
  IF legacy_type IS NULL OR trim(legacy_type) = '' THEN
    RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
  END IF;

  -- Convert legacy types to new standardized types
  CASE 
    WHEN legacy_type ILIKE '%פינוי%בינוי%' OR legacy_type ILIKE '%פינוי-בינוי%' THEN
      RETURN 'פינוי־בינוי (מתחמים)';
    WHEN legacy_type ILIKE '%תמ"א 38/1%' OR legacy_type ILIKE '%חיזוק%' THEN
      RETURN 'תמ"א 38/1 – חיזוק ותוספות';
    WHEN legacy_type ILIKE '%תמ"א 38/2%' OR legacy_type ILIKE '%הריסה%' THEN
      RETURN 'תמ"א 38/2 – הריסה ובנייה מחדש';
    WHEN legacy_type ILIKE '%שינוי ייעוד%' OR legacy_type ILIKE '%תב"ע%' THEN
      RETURN 'שינוי ייעוד / הפקדת תב"ע';
    WHEN legacy_type ILIKE '%איחוד%חלוקה%' OR legacy_type ILIKE '%פרצלציה%' THEN
      RETURN 'איחוד וחלוקה / פרצלציה';
    WHEN legacy_type ILIKE '%רמ"י%' OR legacy_type ILIKE '%משרד השיכון%' THEN
      RETURN 'עבודה מול רמ"י / משרד השיכון';
    WHEN legacy_type ILIKE '%מתחמי מגורים%' THEN
      RETURN 'מתחמי מגורים משולבים';
    WHEN legacy_type ILIKE '%ביוב%' OR legacy_type ILIKE '%ניקוז%' THEN
      RETURN 'ביוב / ניקוז';
    WHEN legacy_type ILIKE '%מגורים%' THEN
      RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
    WHEN legacy_type ILIKE '%משרדים%' OR legacy_type ILIKE '%משרד%' THEN
      RETURN 'משרדים עד 8 קומות';
    WHEN legacy_type ILIKE '%תעשי%' THEN
      RETURN 'תעשייה קלה / מלאכה';
    WHEN legacy_type ILIKE '%בית ספר%' OR legacy_type ILIKE '%חינוך%' THEN
      RETURN 'בתי ספר יסודיים / תיכונים';
    WHEN legacy_type ILIKE '%מלון%' THEN
      RETURN 'מלון';
    WHEN legacy_type ILIKE '%קניון%' OR legacy_type ILIKE '%מסחר%' THEN
      RETURN 'מרכזים מסחריים שכונתיים';
    ELSE
      RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
  END CASE;
END;
$function$;
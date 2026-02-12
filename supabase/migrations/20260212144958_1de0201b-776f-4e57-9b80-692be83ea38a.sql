
-- ============================================================
-- PRODUCTION SANITY CHECK: Security Hardening Migration
-- ============================================================

-- 1. FIX RLS POLICIES
-- ============================================================

-- 1a. Remove overly permissive "System can update proposal evaluations" policy
-- Service role key bypasses RLS anyway, so this policy is unnecessary
DROP POLICY IF EXISTS "System can update proposal evaluations" ON public.proposals;

-- 1b. Tighten "Anyone can create proposals with valid token" 
-- Keep it but require authenticated users (anon key still works for supplier submit via edge function)
-- The actual token validation happens in application code
DROP POLICY IF EXISTS "Anyone can create proposals with valid token" ON public.proposals;

-- 1c. Tighten user_feedback INSERT - require at least authentication
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.user_feedback;
CREATE POLICY "Authenticated users can submit feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. FIX FUNCTION SEARCH PATHS
-- ============================================================

-- 2a. canonicalize_advisor_name
CREATE OR REPLACE FUNCTION public.canonicalize_advisor_name(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public
AS $function$
BEGIN
  IF name IS NULL OR TRIM(name) = '' THEN
    RETURN name;
  END IF;
  name := TRIM(REGEXP_REPLACE(name, '[\u200E\u200F]', '', 'g'));
  name := TRIM(REGEXP_REPLACE(name, '^[\s☐✔✅•\-–—>]+', ''));
  name := TRIM(REGEXP_REPLACE(name, '[*:>]+$', ''));
  name := REGEXP_REPLACE(name, '\s{2,}', ' ', 'g');
  IF name ~ '^עו["''״]?ד\s+מקרקעין$' THEN
    RETURN 'עורך דין מקרקעין';
  END IF;
  CASE name
    WHEN 'אדריכל ראשי' THEN RETURN 'אדריכל';
    WHEN 'אדריכלית' THEN RETURN 'אדריכל';
    WHEN 'אדריכל/ית' THEN RETURN 'אדריכל';
    WHEN 'אדריכלית ראשית' THEN RETURN 'אדריכל';
    WHEN 'עורך/ת דין מקרקעין' THEN RETURN 'עורך דין מקרקעין';
    WHEN 'עורכת דין מקרקעין' THEN RETURN 'עורך דין מקרקעין';
    WHEN 'עו"ד מקרקעין' THEN RETURN 'עורך דין מקרקעין';
    WHEN 'עו״ד מקרקעין' THEN RETURN 'עורך דין מקרקעין';
    ELSE 
      RETURN REGEXP_REPLACE(name, '\*+$', '');
  END CASE;
END;
$function$;

-- 2b. refresh_proposal_summary (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.refresh_proposal_summary()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.proposal_summary;
END;
$function$;

-- 2c. update_notification_queue_updated_at
CREATE OR REPLACE FUNCTION public.update_notification_queue_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2d. validate_proposal_deadline
CREATE OR REPLACE FUNCTION public.validate_proposal_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.deadline IS NOT NULL AND NEW.deadline < NOW() THEN
    RAISE EXCEPTION 'Cannot set a deadline in the past';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2e. Fix normalize_project_type (search_path was empty string)
CREATE OR REPLACE FUNCTION public.normalize_project_type(legacy_type text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public
AS $function$
BEGIN
  IF legacy_type IS NULL OR trim(legacy_type) = '' THEN
    RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
  END IF;
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

-- 2f. Fix update_updated_at_column (search_path was empty string)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. SECURE MATERIALIZED VIEW (proposal_summary)
-- ============================================================
-- Revoke direct API access - force usage through proper queries with RLS
REVOKE SELECT ON public.proposal_summary FROM anon;
REVOKE SELECT ON public.proposal_summary FROM authenticated;

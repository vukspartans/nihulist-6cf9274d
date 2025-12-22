-- Create a SECURITY DEFINER function to atomically create organization and link to user
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  p_name TEXT,
  p_type TEXT DEFAULT 'entrepreneur',
  p_registration_number TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'Israel',
  p_location TEXT DEFAULT NULL,
  p_founding_year INTEGER DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_employee_count TEXT DEFAULT NULL,
  p_activity_categories JSONB DEFAULT '[]'::JSONB,
  p_primary_activity_category TEXT DEFAULT NULL,
  p_activity_scope TEXT DEFAULT NULL,
  p_activity_scope_tier TEXT DEFAULT NULL,
  p_activity_regions TEXT[] DEFAULT '{}'::TEXT[],
  p_linkedin_url TEXT DEFAULT NULL,
  p_onboarding_completed_at TIMESTAMPTZ DEFAULT NULL,
  p_onboarding_skipped_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_company_id UUID;
  v_company JSONB;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND organization_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already has an organization';
  END IF;

  -- Create the company
  INSERT INTO companies (
    name, type, registration_number, country, location,
    founding_year, phone, email, website, description,
    employee_count, activity_categories, primary_activity_category,
    activity_scope, activity_scope_tier, activity_regions,
    linkedin_url, onboarding_completed_at, onboarding_skipped_at
  ) VALUES (
    p_name, p_type, p_registration_number, p_country, p_location,
    p_founding_year, p_phone, p_email, p_website, p_description,
    p_employee_count, p_activity_categories, p_primary_activity_category,
    p_activity_scope, p_activity_scope_tier, p_activity_regions,
    p_linkedin_url, p_onboarding_completed_at, p_onboarding_skipped_at
  )
  RETURNING id INTO v_company_id;

  -- Link to user's profile
  UPDATE profiles
  SET organization_id = v_company_id
  WHERE user_id = auth.uid();

  -- Return the full company as JSON
  SELECT to_jsonb(c.*) INTO v_company
  FROM companies c
  WHERE c.id = v_company_id;

  RETURN v_company;
END;
$$;
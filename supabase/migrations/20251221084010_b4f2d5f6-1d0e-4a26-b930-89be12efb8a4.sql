-- Step 1: Create missing advisor records for users who signed up as advisors but don't have advisor records
INSERT INTO public.advisors (user_id, company_name, is_active, admin_approved)
SELECT 
  p.user_id,
  COALESCE(p.company_name, p.name, 'לא הוגדר'),
  true,
  false
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE ur.role = 'advisor'
AND NOT EXISTS (
  SELECT 1 FROM public.advisors a WHERE a.user_id = p.user_id
)
ON CONFLICT DO NOTHING;

-- Step 2: Create function to auto-create advisor record when user signs up with advisor role
CREATE OR REPLACE FUNCTION public.handle_new_advisor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta_role text;
  expertise_arr text[];
BEGIN
  meta_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Only create advisor record if signing up as advisor
  IF meta_role = 'advisor' THEN
    -- Parse expertise from metadata if provided (stored as array or comma-separated string)
    BEGIN
      IF NEW.raw_user_meta_data ? 'expertise' THEN
        -- Try to parse as JSON array first
        IF jsonb_typeof((NEW.raw_user_meta_data -> 'expertise')) = 'array' THEN
          SELECT array_agg(elem::text)
          INTO expertise_arr
          FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'expertise') AS elem;
        ELSE
          -- Fallback to comma-separated string
          expertise_arr := string_to_array(NEW.raw_user_meta_data ->> 'expertise', ',');
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      expertise_arr := NULL;
    END;
    
    INSERT INTO public.advisors (
      user_id,
      company_name,
      expertise,
      position_in_office,
      is_active,
      admin_approved
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'company_name',
      COALESCE(expertise_arr, '{}'::text[]),
      NEW.raw_user_meta_data ->> 'position_in_office',
      true,
      false  -- Requires admin approval
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger to run after user creation
DROP TRIGGER IF EXISTS on_auth_user_created_advisor ON auth.users;
CREATE TRIGGER on_auth_user_created_advisor
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_advisor();
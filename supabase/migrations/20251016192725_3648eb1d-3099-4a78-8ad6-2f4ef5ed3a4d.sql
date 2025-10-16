-- Fix handle_new_user trigger to save expertise field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_uuid UUID;
  user_role TEXT;
BEGIN
  -- Get the user role from metadata
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'entrepreneur');
  
  -- Insert into profiles with all metadata including email
  INSERT INTO public.profiles (
    user_id, 
    name, 
    phone, 
    company_name, 
    role,
    email
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'company_name',
    user_role,
    NEW.email
  );
  
  -- If user has a company name, create a company
  IF NEW.raw_user_meta_data ->> 'company_name' IS NOT NULL AND 
     NEW.raw_user_meta_data ->> 'company_name' != '' THEN
    
    INSERT INTO public.companies (
      name,
      type,
      location
    )
    VALUES (
      NEW.raw_user_meta_data ->> 'company_name',
      user_role,
      NEW.raw_user_meta_data ->> 'location'
    )
    RETURNING id INTO company_uuid;
    
    -- Add user as company owner
    INSERT INTO public.company_members (
      company_id,
      user_id,
      role
    )
    VALUES (
      company_uuid,
      NEW.id,
      'owner'
    );
  END IF;
  
  -- If user is an advisor, create advisor record with admin_approved = false (pending approval)
  IF user_role = 'advisor' THEN
    INSERT INTO public.advisors (
      user_id,
      company_name,
      location,
      company_id,
      activity_regions,
      office_size,
      position_in_office,
      is_active,
      admin_approved,
      expertise
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'company_name',
      NEW.raw_user_meta_data ->> 'location',
      company_uuid,
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'activity_regions' IS NOT NULL 
        THEN string_to_array(NEW.raw_user_meta_data ->> 'activity_regions', ',')
        ELSE '{}'::text[]
      END,
      NEW.raw_user_meta_data ->> 'office_size',
      NEW.raw_user_meta_data ->> 'position_in_office',
      true,
      false,
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'expertise' IS NOT NULL AND NEW.raw_user_meta_data ->> 'expertise' != ''
        THEN string_to_array(NEW.raw_user_meta_data ->> 'expertise', ',')
        ELSE '{}'::text[]
      END
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update existing advisors with expertise from auth.users metadata
UPDATE public.advisors a
SET expertise = string_to_array(u.raw_user_meta_data ->> 'expertise', ',')
FROM auth.users u
WHERE a.user_id = u.id 
  AND u.raw_user_meta_data ->> 'expertise' IS NOT NULL
  AND u.raw_user_meta_data ->> 'expertise' != ''
  AND (a.expertise IS NULL OR array_length(a.expertise, 1) IS NULL);
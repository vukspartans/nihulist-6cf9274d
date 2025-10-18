-- Migration: Sync profiles.role to user_roles and update handle_new_user trigger
-- This ensures role consistency between profiles table and user_roles table

-- Step 1: Sync existing roles from profiles.role into user_roles
-- Only insert if the role doesn't already exist to avoid duplicates
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT 
  p.user_id,
  p.role::app_role,
  p.user_id  -- Self-assigned during migration
FROM public.profiles p
WHERE p.role IN ('admin', 'entrepreneur', 'advisor', 'supplier')
  AND NOT EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id 
      AND ur.role = p.role::app_role
  );

-- Step 2: Update the handle_new_user trigger function to insert into user_roles
-- This ensures new users get their role in BOTH profiles and user_roles tables
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
  
  -- Insert into user_roles table for the role-based access control
  -- Only insert valid app_role enum values
  IF user_role IN ('admin', 'entrepreneur', 'advisor', 'supplier') THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (NEW.id, user_role::app_role, NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;  -- Prevent duplicates
  END IF;
  
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
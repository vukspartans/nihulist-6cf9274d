-- Add new columns to advisors table for activity regions and office size
ALTER TABLE advisors 
ADD COLUMN IF NOT EXISTS activity_regions text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS office_size text;

-- Update the handle_new_user function to include new fields
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
  
  -- Insert into profiles with all metadata
  INSERT INTO public.profiles (
    user_id, 
    name, 
    phone, 
    company_name, 
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'company_name',
    user_role
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
  
  -- If user is an advisor, also create advisor record
  IF user_role = 'advisor' THEN
    INSERT INTO public.advisors (
      user_id,
      company_name,
      location,
      company_id,
      activity_regions,
      office_size
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
      NEW.raw_user_meta_data ->> 'office_size'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
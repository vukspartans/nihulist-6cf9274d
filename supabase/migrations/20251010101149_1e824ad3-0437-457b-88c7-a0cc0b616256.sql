-- Add admin_approved column and related audit fields to advisors table
ALTER TABLE public.advisors 
ADD COLUMN admin_approved boolean NOT NULL DEFAULT false;

ALTER TABLE public.advisors 
ADD COLUMN approved_at timestamp with time zone;

ALTER TABLE public.advisors 
ADD COLUMN approved_by uuid REFERENCES auth.users(id);

-- Set is_active default back to true (account active by default)
ALTER TABLE public.advisors 
ALTER COLUMN is_active SET DEFAULT true;

-- Update handle_new_user function to set admin_approved = false for new advisors
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
      admin_approved
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
      false
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update generate_project_recommendations to filter by both is_active AND admin_approved
CREATE OR REPLACE FUNCTION public.generate_project_recommendations(project_uuid uuid)
RETURNS TABLE(supplier_id uuid, supplier_name text, match_score numeric, confidence numeric, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  project_rec RECORD;
  supplier_rec RECORD;
  calculated_score NUMERIC;
  calculated_confidence NUMERIC;
  match_reason TEXT;
BEGIN
  -- Get project details
  SELECT * INTO project_rec FROM public.projects WHERE id = project_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Find matching suppliers based on expertise and location
  -- IMPORTANT: Only include active AND admin-approved suppliers
  FOR supplier_rec IN 
    SELECT * FROM public.suppliers 
    WHERE is_active = true
  LOOP
    -- Calculate basic match score (this is simplified - in reality you'd use more sophisticated AI)
    calculated_score := 0;
    calculated_confidence := 0;
    match_reason := '';
    
    -- Location match
    IF supplier_rec.location = project_rec.location THEN
      calculated_score := calculated_score + 30;
      match_reason := match_reason || 'Location match. ';
    END IF;
    
    -- Expertise match (simplified check)
    IF project_rec.type = ANY(supplier_rec.expertise) THEN
      calculated_score := calculated_score + 40;
      match_reason := match_reason || 'Expertise match. ';
    END IF;
    
    -- Rating bonus
    IF supplier_rec.rating IS NOT NULL AND supplier_rec.rating >= 4.0 THEN
      calculated_score := calculated_score + 20;
      match_reason := match_reason || 'High rating. ';
    END IF;
    
    -- Past projects bonus
    IF array_length(supplier_rec.past_projects, 1) > 5 THEN
      calculated_score := calculated_score + 10;
      match_reason := match_reason || 'Extensive experience. ';
    END IF;
    
    -- Calculate confidence based on available data
    calculated_confidence := CASE 
      WHEN supplier_rec.rating IS NOT NULL AND array_length(supplier_rec.expertise, 1) > 0 THEN 85
      WHEN supplier_rec.rating IS NOT NULL OR array_length(supplier_rec.expertise, 1) > 0 THEN 70
      ELSE 50
    END;
    
    -- Only return suppliers with reasonable match scores
    IF calculated_score >= 20 THEN
      supplier_id := supplier_rec.id;
      supplier_name := supplier_rec.name;
      match_score := calculated_score;
      confidence := calculated_confidence;
      reason := TRIM(match_reason);
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$function$;
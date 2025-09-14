-- Fix Function Search Path Mutable by updating all existing functions to have secure search_path

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Update handle_new_user function  
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  RETURN NEW;
END;
$function$;

-- Update generate_project_recommendations function
CREATE OR REPLACE FUNCTION public.generate_project_recommendations(project_uuid uuid)
 RETURNS TABLE(supplier_id uuid, supplier_name text, match_score numeric, confidence numeric, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
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

-- Update send_rfp_invitations function
CREATE OR REPLACE FUNCTION public.send_rfp_invitations(project_uuid uuid, selected_supplier_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(rfp_id uuid, invites_sent integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  project_rec RECORD;
  rfp_uuid UUID;
  supplier_rec RECORD;
  invite_count INTEGER := 0;
  supplier_list UUID[];
BEGIN
  -- Verify project ownership
  SELECT * INTO project_rec FROM public.projects 
  WHERE id = project_uuid AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  -- Create RFP record
  INSERT INTO public.rfps (project_id, subject, body_html, sent_by)
  VALUES (
    project_uuid,
    'RFP: ' || project_rec.name,
    '<h1>' || project_rec.name || '</h1><p>We are seeking proposals for this project.</p>',
    auth.uid()
  )
  RETURNING id INTO rfp_uuid;
  
  -- Determine supplier list
  IF selected_supplier_ids IS NOT NULL THEN
    supplier_list := selected_supplier_ids;
  ELSE
    -- Use AI recommendations if no specific suppliers selected
    SELECT array_agg(rec.supplier_id) INTO supplier_list
    FROM public.generate_project_recommendations(project_uuid) rec
    WHERE rec.match_score >= 50
    LIMIT 10;
  END IF;
  
  -- Create invitations for each supplier
  FOR supplier_rec IN 
    SELECT * FROM public.suppliers 
    WHERE id = ANY(supplier_list) AND is_active = true
  LOOP
    INSERT INTO public.rfp_invites (rfp_id, supplier_id, email, submit_token)
    VALUES (
      rfp_uuid,
      supplier_rec.id,
      supplier_rec.email,
      encode(gen_random_bytes(32), 'hex')
    );
    
    invite_count := invite_count + 1;
  END LOOP;
  
  -- Return results
  rfp_id := rfp_uuid;
  invites_sent := invite_count;
  RETURN NEXT;
END;
$function$;

-- Update normalize_project_type function
CREATE OR REPLACE FUNCTION public.normalize_project_type(legacy_type text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = ''
AS $function$
BEGIN
  -- Handle null or empty types
  IF legacy_type IS NULL OR trim(legacy_type) = '' THEN
    RETURN 'מגורים בבנייה רוויה (5–8 קומות)'; -- Default fallback
  END IF;

  -- Convert legacy types to new standardized types
  CASE 
    WHEN legacy_type ILIKE '%בניין מגורים%' OR legacy_type ILIKE '%בניית בניין מגורים%' THEN
      RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
    WHEN legacy_type ILIKE '%תמ"א%' OR legacy_type ILIKE '%התחדשות עירונית%' THEN
      RETURN 'תמ"א 38 - פינוי ובינוי';
    WHEN legacy_type ILIKE '%ביוב%' OR legacy_type ILIKE '%ניקוז%' THEN
      RETURN 'רשתות ביוב וניקוז';
    WHEN legacy_type ILIKE '%מגורים%' THEN
      RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
    WHEN legacy_type ILIKE '%משרדים%' OR legacy_type ILIKE '%משרד%' THEN
      RETURN 'בניין משרדים';
    WHEN legacy_type ILIKE '%תעשי%' THEN
      RETURN 'מבנה תעשייה';
    WHEN legacy_type ILIKE '%בריכ%' THEN
      RETURN 'מתקני ספורט ונופש';
    WHEN legacy_type ILIKE '%בית ספר%' OR legacy_type ILIKE '%חינוך%' THEN
      RETURN 'בית ספר';
    WHEN legacy_type ILIKE '%בית חולים%' OR legacy_type ILIKE '%רפוא%' THEN
      RETURN 'בית חולים';
    WHEN legacy_type ILIKE '%מלון%' THEN
      RETURN 'מלון';
    WHEN legacy_type ILIKE '%קניון%' OR legacy_type ILIKE '%מסחר%' THEN
      RETURN 'מרכז מסחרי / קניון';
    ELSE
      -- Default fallback for unrecognized types
      RETURN 'מגורים בבנייה רוויה (5–8 קומות)';
  END CASE;
END;
$function$;
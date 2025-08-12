-- Fix the search path security warnings for the new functions
CREATE OR REPLACE FUNCTION public.generate_project_recommendations(project_uuid UUID)
RETURNS TABLE(
  supplier_id UUID,
  supplier_name TEXT,
  match_score NUMERIC,
  confidence NUMERIC,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Fix the search path security warning for the RFP function  
CREATE OR REPLACE FUNCTION public.send_rfp_invitations(
  project_uuid UUID,
  selected_supplier_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
  rfp_id UUID,
  invites_sent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;
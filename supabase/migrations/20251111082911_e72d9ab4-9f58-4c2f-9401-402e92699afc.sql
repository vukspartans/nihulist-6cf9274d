-- Phase 5: Fix database security issues
-- Add SET search_path = 'public' to functions with mutable search_path

-- Fix send_rfp_invitations function
CREATE OR REPLACE FUNCTION public.send_rfp_invitations(project_uuid uuid, selected_supplier_ids uuid[] DEFAULT NULL::uuid[], email_subject text DEFAULT NULL::text, email_body_html text DEFAULT NULL::text)
 RETURNS TABLE(rfp_id uuid, invites_sent integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  project_rec RECORD;
  rfp_uuid UUID;
  supplier_rec RECORD;
  invite_count INTEGER := 0;
  supplier_list UUID[];
  final_subject TEXT;
  final_body TEXT;
  personalized_body TEXT;
BEGIN
  -- Verify project ownership
  SELECT * INTO project_rec FROM public.projects 
  WHERE id = project_uuid AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  -- Use custom email content if provided, otherwise use defaults
  final_subject := COALESCE(email_subject, 'RFP: ' || project_rec.name);
  final_body := COALESCE(email_body_html, '<h1>' || project_rec.name || '</h1><p>We are seeking proposals for this project.</p>');
  
  -- Create RFP record with custom or default content
  INSERT INTO public.rfps (project_id, subject, body_html, sent_by)
  VALUES (
    project_uuid,
    final_subject,
    final_body,
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
  
  -- Create invitations for each supplier with personalized content
  FOR supplier_rec IN 
    SELECT * FROM public.suppliers 
    WHERE id = ANY(supplier_list) AND is_active = true
  LOOP
    -- Personalize the email body for this specific supplier
    personalized_body := final_body;
    personalized_body := replace(personalized_body, '{{שם_הפרויקט}}', project_rec.name);
    personalized_body := replace(personalized_body, '{{שם_המשרד}}', COALESCE(supplier_rec.name, '[שם המשרד]'));
    
    INSERT INTO public.rfp_invites (rfp_id, supplier_id, email, submit_token, personalized_body_html)
    VALUES (
      rfp_uuid,
      supplier_rec.id,
      supplier_rec.email,
      encode(gen_random_bytes(32), 'hex'),
      personalized_body
    );
    
    invite_count := invite_count + 1;
  END LOOP;
  
  -- Return results
  rfp_id := rfp_uuid;
  invites_sent := invite_count;
  RETURN NEXT;
END;
$function$;

-- Fix generate_project_recommendations function
CREATE OR REPLACE FUNCTION public.generate_project_recommendations(project_uuid uuid)
 RETURNS TABLE(supplier_id uuid, supplier_name text, match_score numeric, confidence numeric, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  project_rec RECORD;
  supplier_rec RECORD;
  calculated_score NUMERIC;
  calculated_confidence NUMERIC;
  match_reason TEXT;
BEGIN
  SELECT * INTO project_rec FROM public.projects WHERE id = project_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  FOR supplier_rec IN 
    SELECT * FROM public.suppliers 
    WHERE is_active = true
  LOOP
    calculated_score := 0;
    calculated_confidence := 0;
    match_reason := '';
    
    IF supplier_rec.location = project_rec.location THEN
      calculated_score := calculated_score + 30;
      match_reason := match_reason || 'Location match. ';
    END IF;
    
    IF project_rec.type = ANY(supplier_rec.expertise) THEN
      calculated_score := calculated_score + 40;
      match_reason := match_reason || 'Expertise match. ';
    END IF;
    
    IF supplier_rec.rating IS NOT NULL AND supplier_rec.rating >= 4.0 THEN
      calculated_score := calculated_score + 20;
      match_reason := match_reason || 'High rating. ';
    END IF;
    
    IF array_length(supplier_rec.past_projects, 1) > 5 THEN
      calculated_score := calculated_score + 10;
      match_reason := match_reason || 'Extensive experience. ';
    END IF;
    
    calculated_confidence := CASE 
      WHEN supplier_rec.rating IS NOT NULL AND array_length(supplier_rec.expertise, 1) > 0 THEN 85
      WHEN supplier_rec.rating IS NOT NULL OR array_length(supplier_rec.expertise, 1) > 0 THEN 70
      ELSE 50
    END;
    
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
-- Update send_rfp_invitations function to accept custom email content
CREATE OR REPLACE FUNCTION public.send_rfp_invitations(
  project_uuid UUID, 
  selected_supplier_ids UUID[] DEFAULT NULL,
  email_subject TEXT DEFAULT NULL,
  email_body_html TEXT DEFAULT NULL
)
RETURNS TABLE(rfp_id UUID, invites_sent INTEGER)
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
  final_subject TEXT;
  final_body TEXT;
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
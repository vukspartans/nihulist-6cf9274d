
-- Line Items for Proposal A (150,000)
INSERT INTO public.proposal_line_items (proposal_id, name, description, category, quantity, unit_price, total, is_optional, display_order, version_number)
VALUES 
  ('33333333-3333-3333-3333-333333333331', 'Initial Planning', 'Site survey and conceptual design', 'Planning', 1, 35000, 35000, false, 1, 1),
  ('33333333-3333-3333-3333-333333333331', 'Consultant Coordination', 'Structural, electrical, plumbing coordination', 'Coordination', 1, 25000, 25000, false, 2, 1),
  ('33333333-3333-3333-3333-333333333331', 'Permit Documents', 'Prepare all permit submission documents', 'Licensing', 1, 45000, 45000, false, 3, 1),
  ('33333333-3333-3333-3333-333333333331', 'Permit Support', 'Support through permit approval process', 'Licensing', 1, 30000, 30000, false, 4, 1),
  ('33333333-3333-3333-3333-333333333331', '3D Renderings', '5 high-quality 3D renderings', 'Extra', 5, 3000, 15000, true, 5, 1);

-- Line Items for Proposal B (180,000)
INSERT INTO public.proposal_line_items (proposal_id, name, description, category, quantity, unit_price, total, is_optional, display_order, version_number)
VALUES 
  ('33333333-3333-3333-3333-333333333332', 'Design Concept', 'Full design concept with mood board', 'Design', 1, 40000, 40000, false, 1, 1),
  ('33333333-3333-3333-3333-333333333332', 'Space Planning', 'Detailed planning of all spaces', 'Planning', 1, 50000, 50000, false, 2, 1),
  ('33333333-3333-3333-3333-333333333332', 'Material Selection', 'Materials and finishes selection', 'Design', 1, 35000, 35000, false, 3, 1),
  ('33333333-3333-3333-3333-333333333332', 'Site Supervision', 'Site visits and contractor supervision', 'Supervision', 10, 3500, 35000, false, 4, 1),
  ('33333333-3333-3333-3333-333333333332', 'Custom Furniture', 'Custom furniture design', 'Extra', 1, 20000, 20000, true, 5, 1);

-- Line Items for Proposal C (95,000)
INSERT INTO public.proposal_line_items (proposal_id, name, description, category, quantity, unit_price, total, is_optional, display_order, version_number)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'Basic Planning', 'Basic architectural plans', 'Planning', 1, 40000, 40000, false, 1, 1),
  ('33333333-3333-3333-3333-333333333333', 'Permit Submission', 'Document prep and local permit submission', 'Licensing', 1, 35000, 35000, false, 2, 1),
  ('33333333-3333-3333-3333-333333333333', 'Basic Revisions', 'Basic revisions and corrections', 'Licensing', 1, 20000, 20000, false, 3, 1);

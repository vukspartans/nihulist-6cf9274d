
-- Step 2: Create 3 RFP Invites
INSERT INTO public.rfp_invites (id, rfp_id, advisor_id, advisor_type, email, submit_token, status, deadline_at)
VALUES ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', '6f1c5e53-f2ab-4bae-bc00-a9484603abf0', 'architect', 'commercial_consultant_1@spartans.tech', 'test-token-001', 'submitted', now() + interval '7 days');

INSERT INTO public.rfp_invites (id, rfp_id, advisor_id, advisor_type, email, submit_token, status, deadline_at)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'd2a7ae01-81b3-44d6-903c-dbfd26384433', 'designer', 'commercial_consultant_2@spartans.tech', 'test-token-002', 'submitted', now() + interval '7 days');

INSERT INTO public.rfp_invites (id, rfp_id, advisor_id, advisor_type, email, submit_token, status, deadline_at)
VALUES ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', '4480315e-37b7-41a3-8721-e9095ec54549', 'architect', 'commercial_consultant_3@spartans.tech', 'test-token-003', 'submitted', now() + interval '7 days');

-- Step 3: Create 3 Proposals
INSERT INTO public.proposals (id, project_id, advisor_id, supplier_name, price, timeline_days, status, scope_text, terms, current_version, has_active_negotiation, negotiation_count, declaration_text, signature_blob)
VALUES ('33333333-3333-3333-3333-333333333331', 'a666c763-131d-4536-b162-acae90854ff6', '6f1c5e53-f2ab-4bae-bc00-a9484603abf0', 'Premium Architecture Experts Ltd.', 150000, 90, 'submitted', 'Full architectural planning including licensing, coordination, and submissions.', 'Payment in 3 installments', 1, false, 0, 'I declare all details are accurate', 'data:image/png;base64,iVBORw0KGgo=');

INSERT INTO public.proposals (id, project_id, advisor_id, supplier_name, price, timeline_days, status, scope_text, terms, current_version, has_active_negotiation, negotiation_count, declaration_text, signature_blob)
VALUES ('33333333-3333-3333-3333-333333333332', 'a666c763-131d-4536-b162-acae90854ff6', 'd2a7ae01-81b3-44d6-903c-dbfd26384433', 'Elite Design Solutions', 180000, 120, 'submitted', 'Interior design including space planning and material selection.', 'Payment in 4 installments', 1, false, 0, 'I declare all details are accurate', 'data:image/png;base64,iVBORw0KGgo=');

INSERT INTO public.proposals (id, project_id, advisor_id, supplier_name, price, timeline_days, status, scope_text, terms, current_version, has_active_negotiation, negotiation_count, declaration_text, signature_blob)
VALUES ('33333333-3333-3333-3333-333333333333', 'a666c763-131d-4536-b162-acae90854ff6', '4480315e-37b7-41a3-8721-e9095ec54549', 'Budget Build Architects', 95000, 60, 'submitted', 'Basic architectural planning for the project.', 'Full payment upfront', 1, false, 0, 'I declare all details are accurate', 'data:image/png;base64,iVBORw0KGgo=');

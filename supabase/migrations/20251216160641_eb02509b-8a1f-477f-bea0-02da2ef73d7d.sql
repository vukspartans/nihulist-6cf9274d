
-- Proposal Versions (created_by is nullable)
INSERT INTO public.proposal_versions (id, proposal_id, version_number, price, timeline_days, scope_text, terms, created_by)
VALUES ('77777777-7777-7777-7777-777777777771', '33333333-3333-3333-3333-333333333331', 1, 150000, 90, 'Full architectural planning', 'Payment in 3 installments', NULL);

INSERT INTO public.proposal_versions (id, proposal_id, version_number, price, timeline_days, scope_text, terms, created_by)
VALUES ('77777777-7777-7777-7777-777777777772', '33333333-3333-3333-3333-333333333332', 1, 180000, 120, 'Interior design with space planning', 'Payment in 4 installments', NULL);

INSERT INTO public.proposal_versions (id, proposal_id, version_number, price, timeline_days, scope_text, terms, created_by)
VALUES ('77777777-7777-7777-7777-777777777773', '33333333-3333-3333-3333-333333333333', 1, 95000, 60, 'Basic architectural planning', 'Full payment upfront', NULL);

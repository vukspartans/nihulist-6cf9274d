
-- Step 1: Create RFP
INSERT INTO public.rfps (id, project_id, subject, body_html, sent_by, sent_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'a666c763-131d-4536-b162-acae90854ff6',
  'Test RFP - Igor-Test Project',
  '<div dir="rtl"><h1>Test RFP</h1></div>',
  '975deb79-83ff-4a85-9a00-b4b122af0bdf',
  now()
);

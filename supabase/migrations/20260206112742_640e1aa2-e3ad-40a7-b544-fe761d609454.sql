
-- Test Data for Milestone & Payment Terms Flow Testing
-- Final corrected version with proper enum value

-- 1. Create a new RFP for milestone testing
INSERT INTO rfps (id, project_id, subject, body_html, sent_at, sent_by, status)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'בקשה להצעת מחיר - בדיקת אבני דרך',
  '<p>בקשה לבדיקת תהליך אבני דרך ותנאי תשלום</p>',
  now(),
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001',
  'sent'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RFP invite for Pre-submission scenario (opened, no proposal yet)
INSERT INTO rfp_invites (
  id, rfp_id, email, advisor_id, advisor_type, status,
  submit_token, deadline_at, payment_terms,
  request_title, request_content
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
  'vendor.test+billding@example.com',
  'c7b93dfd-58f6-43d8-aabf-5cce18f3119d',
  'יועץ בדיקות (TEST)',
  'opened',
  encode(gen_random_bytes(32), 'hex'),
  now() + interval '7 days',
  '{
    "payment_term_type": "net_30",
    "index_type": "cpi",
    "index_base_month": "2026-02",
    "milestone_payments": [
      { "description": "מקדמה עם החתימה על ההסכם", "percentage": 20, "trigger": "עם חתימה" },
      { "description": "עם אישור תכנית ההגשה", "percentage": 25, "trigger": "" },
      { "description": "לאחר הגשה לוועדה", "percentage": 25, "trigger": "" },
      { "description": "עם קבלת היתר", "percentage": 20, "trigger": "" },
      { "description": "עם סיום הפיקוח העליון", "percentage": 10, "trigger": "" }
    ],
    "notes": "התשלום כולל מע\"מ"
  }'::jsonb,
  'בדיקת אבני דרך - מקרה טרם הגשה',
  'הזמנה להגשת הצעת מחיר עם 5 אבני דרך מוגדרות מראש'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create second invite for Submitted scenario
INSERT INTO rfp_invites (
  id, rfp_id, email, advisor_id, advisor_type, status,
  submit_token, deadline_at, payment_terms,
  request_title, request_content
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
  'vendor.test1+billding@example.com',
  'affcee25-5666-438a-a4bc-136d106f59ba',
  'יועץ בדיקות (TEST)',
  'submitted',
  encode(gen_random_bytes(32), 'hex'),
  now() + interval '7 days',
  '{
    "payment_term_type": "net_30",
    "index_type": "cpi",
    "index_base_month": "2026-02",
    "milestone_payments": [
      { "description": "מקדמה עם החתימה על ההסכם", "percentage": 20, "trigger": "עם חתימה" },
      { "description": "עם אישור תכנית ההגשה", "percentage": 25, "trigger": "" },
      { "description": "לאחר הגשה לוועדה", "percentage": 25, "trigger": "" },
      { "description": "עם קבלת היתר", "percentage": 20, "trigger": "" },
      { "description": "עם סיום הפיקוח העליון", "percentage": 10, "trigger": "" }
    ],
    "notes": "התשלום כולל מע\"מ"
  }'::jsonb,
  'בדיקת אבני דרך - מקרה לאחר הגשה',
  'הזמנה להגשת הצעת מחיר - הצעה הוגשה ונעולה'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Create proposal with correct columns
INSERT INTO proposals (
  id, project_id, advisor_id, rfp_invite_id,
  supplier_name, price, timeline_days,
  status, submitted_at,
  milestone_adjustments,
  conditions_json,
  scope_text,
  signature_blob,
  declaration_text
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'affcee25-5666-438a-a4bc-136d106f59ba',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003',
  'TEST_ONLY__Vendor Consulting 2 Ltd',
  85000,
  120,
  'submitted',
  now() - interval '2 hours',
  '[
    {
      "id": "ent-milestone-0",
      "description": "מקדמה עם החתימה על ההסכם",
      "entrepreneur_percentage": 20,
      "consultant_percentage": 15,
      "is_entrepreneur_defined": true
    },
    {
      "id": "ent-milestone-1",
      "description": "עם אישור תכנית ההגשה",
      "entrepreneur_percentage": 25,
      "consultant_percentage": 25,
      "is_entrepreneur_defined": true
    },
    {
      "id": "new-consultant-1",
      "description": "תכניות לביצוע",
      "entrepreneur_percentage": null,
      "consultant_percentage": 20,
      "is_entrepreneur_defined": false
    },
    {
      "id": "ent-milestone-2",
      "description": "לאחר הגשה לוועדה",
      "entrepreneur_percentage": 25,
      "consultant_percentage": 20,
      "is_entrepreneur_defined": true
    },
    {
      "id": "ent-milestone-3",
      "description": "עם קבלת היתר",
      "entrepreneur_percentage": 20,
      "consultant_percentage": 15,
      "is_entrepreneur_defined": true
    },
    {
      "id": "ent-milestone-4",
      "description": "עם סיום הפיקוח העליון",
      "entrepreneur_percentage": 10,
      "consultant_percentage": 5,
      "is_entrepreneur_defined": true
    }
  ]'::jsonb,
  '{
    "payment_terms": "שוטף + 30",
    "payment_term_type": "net_30",
    "index_linked": true,
    "index_type": "cpi"
  }'::jsonb,
  'שירותי ייעוץ מלאים הכוללים: תכנון ראשוני, הכנת מסמכים להגשה, ליווי מול הרשויות, פיקוח עליון',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'אני מצהיר/ה בזאת כי כל הפרטים שמסרתי בהצעה זו הינם נכונים ומלאים'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Create negotiation session with correct status enum value
INSERT INTO negotiation_sessions (
  id, project_id, proposal_id, consultant_advisor_id,
  initiator_id, status, created_at,
  initiator_message, milestone_adjustments,
  target_reduction_percent
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004',
  'affcee25-5666-438a-a4bc-136d106f59ba',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001',
  'awaiting_response',
  now() - interval '1 hour',
  'נבקש לבחון אפשרות להפחתת מקדמה ל-10% ופריסה שונה של האחוזים',
  '[
    {
      "id": "ent-milestone-0",
      "description": "מקדמה עם החתימה על ההסכם",
      "original_percentage": 15,
      "requested_percentage": 10,
      "status": "pending"
    }
  ]'::jsonb,
  5
)
ON CONFLICT (id) DO NOTHING;

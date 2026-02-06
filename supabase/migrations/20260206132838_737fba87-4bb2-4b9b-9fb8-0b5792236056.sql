-- Add test fee items to the test RFP for visual separation testing
-- Pre-submission invite: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002
-- Submitted proposal: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004

-- ============================================
-- 1. MANDATORY Fee Items for Pre-Submission Invite
-- ============================================
INSERT INTO public.rfp_request_fee_items (
  id, rfp_invite_id, item_number, description, unit, quantity, charge_type, is_optional, display_order
) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-fee000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 1, 'שירותי ייעוץ בשלב התכנון הראשוני', 'lump_sum', 1, 'one_time', false, 0),
  ('aaaaaaaa-aaaa-aaaa-aaaa-fee000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 2, 'הכנת מסמכים והתוכנית הטכנית', 'hourly', 40, 'hourly_rate', false, 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-fee000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 3, 'ליווי וייצוג מול הרשויות', 'per_consultant', 2, 'hourly_rate', false, 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-fee000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 4, 'פיקוח עליון על הביצוע', 'per_floor', 5, 'one_time', false, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. OPTIONAL Fee Items for Pre-Submission Invite
-- ============================================
INSERT INTO public.rfp_request_fee_items (
  id, rfp_invite_id, item_number, description, unit, quantity, charge_type, is_optional, display_order
) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-fee000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 1, 'הכנת תוכנית עסקית מפורטת', 'lump_sum', 1, 'one_time', true, 0),
  ('aaaaaaaa-aaaa-aaaa-aaaa-fee000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 2, 'ייעוץ בנושא התקנות תשנ"ד (נגישות)', 'hourly', 8, 'hourly_rate', true, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Update Submitted Proposal with fee_line_items JSONB
-- ============================================
UPDATE public.proposals
SET fee_line_items = '[
  {
    "id": "fee-1",
    "item_number": 1,
    "description": "שירותי ייעוץ בשלב התכנון הראשוני",
    "unit": "lump_sum",
    "quantity": 1,
    "unit_price": 8000,
    "is_optional": false,
    "charge_type": "one_time"
  },
  {
    "id": "fee-2",
    "item_number": 2,
    "description": "הכנת מסמכים והתוכנית הטכנית",
    "unit": "hourly",
    "quantity": 40,
    "unit_price": 350,
    "is_optional": false,
    "charge_type": "hourly_rate"
  },
  {
    "id": "fee-3",
    "item_number": 3,
    "description": "ליווי וייצוג מול הרשויות",
    "unit": "per_consultant",
    "quantity": 2,
    "unit_price": 4500,
    "is_optional": false,
    "charge_type": "hourly_rate"
  },
  {
    "id": "fee-4",
    "item_number": 4,
    "description": "פיקוח עליון על הביצוע",
    "unit": "per_floor",
    "quantity": 5,
    "unit_price": 1200,
    "is_optional": false,
    "charge_type": "one_time"
  },
  {
    "id": "fee-5",
    "item_number": 1,
    "description": "הכנת תוכנית עסקית מפורטת",
    "unit": "lump_sum",
    "quantity": 1,
    "unit_price": 5000,
    "is_optional": true,
    "charge_type": "one_time"
  },
  {
    "id": "fee-6",
    "item_number": 2,
    "description": "ייעוץ בנושא התקנות תשנ״ד (נגישות)",
    "unit": "hourly",
    "quantity": 8,
    "unit_price": 400,
    "is_optional": true,
    "charge_type": "hourly_rate"
  }
]'::jsonb
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004';
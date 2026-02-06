
# Test Data Seed and QA Plan: Fixed Currency (₪) Pricing Validation

## Overview
This plan provides a minimal SQL seed script and comprehensive QA checklist to validate that vendors can only submit price offers as fixed currency amounts (₪), with percentage-based pricing blocked in UI and rejected at API level.

## Existing Test Data Inventory

**Found entities:**
- Project: `TEST_ONLY__Sandbox Project 001` (id: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004`)
- Entrepreneur: `entrepreneur.test+billding@example.com` (user_id: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001`)
- Vendor 1: `vendor.test+billding@example.com` (user_id: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002`, advisor_id: `c7b93dfd-58f6-43d8-aabf-5cce18f3119d`)
- Vendor 2: `vendor.test1+billding@example.com` (user_id: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003`, advisor_id: `affcee25-5666-438a-a4bc-136d106f59ba`)
- RFP: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001` (status: sent)
- Invites for both vendors already exist

**Current proposal statuses found:**
- Multiple submitted proposals exist
- One accepted proposal exists (id: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004`)
- One resolved negotiation session exists

---

## Section 1: SQL Seed Script

```sql
-- =============================================================================
-- TEST SEED: Fixed Currency Pricing Validation
-- =============================================================================
-- Purpose: Create test data for validating that pricing is fixed ₪ only
-- Scenarios covered:
--   A) Draft proposal (editable before submission)
--   B) Submitted proposal (locked)
--   C) Negotiation requested (vendor can submit revised offer)
--   D) Accepted proposal (locked final)
--   + Legacy percent record for backward compatibility testing
-- 
-- SAFETY: 
--   - Idempotent (safe to run multiple times)
--   - Uses deterministic UUIDs with 'aaaaaaaa-' prefix
--   - Only affects TEST__ prefixed data
--   - Wrapped in transaction with rollback on error
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Validate prerequisites exist
-- =============================================================================

DO $$
DECLARE
  v_project_id uuid;
  v_entrepreneur_id uuid;
  v_vendor1_id uuid;
  v_vendor2_id uuid;
  v_vendor1_advisor_id uuid;
  v_vendor2_advisor_id uuid;
  v_rfp_id uuid;
  v_invite1_id uuid;
  v_invite2_id uuid;
BEGIN
  -- Check test project exists
  SELECT id INTO v_project_id 
  FROM projects 
  WHERE name LIKE 'TEST_ONLY__%' AND id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004';
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'TEST project not found. Expected: aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004';
  END IF;

  -- Check entrepreneur exists
  SELECT id INTO v_entrepreneur_id 
  FROM auth.users 
  WHERE email = 'entrepreneur.test+billding@example.com';
  
  IF v_entrepreneur_id IS NULL THEN
    RAISE EXCEPTION 'Test entrepreneur not found: entrepreneur.test+billding@example.com';
  END IF;

  -- Check vendor 1 exists
  SELECT id INTO v_vendor1_id 
  FROM auth.users 
  WHERE email = 'vendor.test+billding@example.com';
  
  IF v_vendor1_id IS NULL THEN
    RAISE EXCEPTION 'Test vendor 1 not found: vendor.test+billding@example.com';
  END IF;

  -- Check vendor 2 exists
  SELECT id INTO v_vendor2_id 
  FROM auth.users 
  WHERE email = 'vendor.test1+billding@example.com';
  
  IF v_vendor2_id IS NULL THEN
    RAISE EXCEPTION 'Test vendor 2 not found: vendor.test1+billding@example.com';
  END IF;

  -- Get advisor IDs
  SELECT id INTO v_vendor1_advisor_id FROM advisors WHERE user_id = v_vendor1_id;
  SELECT id INTO v_vendor2_advisor_id FROM advisors WHERE user_id = v_vendor2_id;

  IF v_vendor1_advisor_id IS NULL OR v_vendor2_advisor_id IS NULL THEN
    RAISE EXCEPTION 'Advisor records not found for test vendors';
  END IF;

  RAISE NOTICE 'All prerequisites validated successfully';
  RAISE NOTICE 'Project: %', v_project_id;
  RAISE NOTICE 'Entrepreneur: %', v_entrepreneur_id;
  RAISE NOTICE 'Vendor 1: % (advisor: %)', v_vendor1_id, v_vendor1_advisor_id;
  RAISE NOTICE 'Vendor 2: % (advisor: %)', v_vendor2_id, v_vendor2_advisor_id;
END $$;

-- =============================================================================
-- STEP 2: Create or ensure test RFP for pricing validation
-- =============================================================================

-- Create a dedicated RFP for pricing tests (if not exists)
INSERT INTO rfps (
  id,
  project_id,
  subject,
  body_html,
  sent_by,
  sent_at,
  status
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-pricerfp0001',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'TEST_ONLY__בדיקת תמחור ₪',
  '<p>בקשה לבדיקת תמחור בשקלים בלבד</p>',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001',
  NOW(),
  'sent'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 3: Create invites for both vendors
-- =============================================================================

-- Invite for vendor 1
INSERT INTO rfp_invites (
  id,
  rfp_id,
  advisor_id,
  email,
  submit_token,
  status,
  deadline_at,
  created_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-priceinv0001',
  'aaaaaaaa-aaaa-aaaa-aaaa-pricerfp0001',
  'c7b93dfd-58f6-43d8-aabf-5cce18f3119d', -- vendor.test advisor_id
  'vendor.test+billding@example.com',
  'test-price-token-vendor1',
  'opened',
  NOW() + INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Invite for vendor 2
INSERT INTO rfp_invites (
  id,
  rfp_id,
  advisor_id,
  email,
  submit_token,
  status,
  deadline_at,
  created_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-priceinv0002',
  'aaaaaaaa-aaaa-aaaa-aaaa-pricerfp0001',
  'affcee25-5666-438a-a4bc-136d106f59ba', -- vendor.test1 advisor_id
  'vendor.test1+billding@example.com',
  'test-price-token-vendor2',
  'opened',
  NOW() + INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 4: Scenario B - Submitted proposal (locked) - Vendor 1
-- =============================================================================
-- A submitted proposal with fixed ₪ pricing that should be locked

INSERT INTO proposals (
  id,
  project_id,
  advisor_id,
  rfp_invite_id,
  supplier_name,
  price,
  currency,
  timeline_days,
  scope_text,
  status,
  submitted_at,
  declaration_text,
  signature_blob,
  signature_meta_json,
  fee_line_items
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-priceprp0001',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'c7b93dfd-58f6-43d8-aabf-5cce18f3119d',
  'aaaaaaaa-aaaa-aaaa-aaaa-priceinv0001',
  'TEST_ONLY__Vendor Consulting Ltd',
  25000,
  'ILS',
  60,
  'הצעה לייעוץ מקצועי עם תמחור קבוע בשקלים',
  'submitted',
  NOW(),
  'אני מאשר את תנאי ההצעה',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  '{"timestamp": "2026-02-06T12:00:00Z", "content_hash": "test-hash-submitted"}',
  '[
    {"id": "fee-price-1", "item_number": 1, "description": "ייעוץ ראשוני", "unit": "lump_sum", "quantity": 1, "unit_price": 15000, "charge_type": "one_time", "is_optional": false},
    {"id": "fee-price-2", "item_number": 2, "description": "ליווי מול רשויות", "unit": "hourly", "quantity": 20, "unit_price": 500, "charge_type": "hourly_rate", "is_optional": false}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Update invite status to submitted
UPDATE rfp_invites 
SET status = 'submitted' 
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-priceinv0001';

-- =============================================================================
-- STEP 5: Scenario C - Negotiation requested - Vendor 2
-- =============================================================================
-- A submitted proposal with active negotiation (vendor can submit revised offer)

INSERT INTO proposals (
  id,
  project_id,
  advisor_id,
  rfp_invite_id,
  supplier_name,
  price,
  currency,
  timeline_days,
  scope_text,
  status,
  submitted_at,
  declaration_text,
  signature_blob,
  signature_meta_json,
  has_active_negotiation,
  negotiation_count,
  current_version,
  fee_line_items
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-priceprp0002',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'affcee25-5666-438a-a4bc-136d106f59ba',
  'aaaaaaaa-aaaa-aaaa-aaaa-priceinv0002',
  'TEST_ONLY__Vendor Consulting 2 Ltd',
  35000,
  'ILS',
  45,
  'הצעה לייעוץ מקצועי - במו"מ',
  'negotiation_requested',
  NOW() - INTERVAL '2 days',
  'אני מאשר את תנאי ההצעה',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  '{"timestamp": "2026-02-04T12:00:00Z", "content_hash": "test-hash-negotiation"}',
  true,
  1,
  1,
  '[
    {"id": "fee-neg-1", "item_number": 1, "description": "תכנון ראשוני", "unit": "lump_sum", "quantity": 1, "unit_price": 20000, "charge_type": "one_time", "is_optional": false},
    {"id": "fee-neg-2", "item_number": 2, "description": "פגישות ייעוץ", "unit": "hourly", "quantity": 30, "unit_price": 500, "charge_type": "hourly_rate", "is_optional": false}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create version 1 snapshot
INSERT INTO proposal_versions (
  id,
  proposal_id,
  version_number,
  price,
  timeline_days,
  scope_text,
  created_at,
  created_by,
  change_reason,
  fee_line_items
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-pricever0001',
  'aaaaaaaa-aaaa-aaaa-aaaa-priceprp0002',
  1,
  35000,
  45,
  'הצעה לייעוץ מקצועי - במו"מ',
  NOW() - INTERVAL '2 days',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003',
  'הגשה ראשונית',
  '[
    {"id": "fee-neg-1", "item_number": 1, "description": "תכנון ראשוני", "unit": "lump_sum", "quantity": 1, "unit_price": 20000, "charge_type": "one_time", "is_optional": false},
    {"id": "fee-neg-2", "item_number": 2, "description": "פגישות ייעוץ", "unit": "hourly", "quantity": 30, "unit_price": 500, "charge_type": "hourly_rate", "is_optional": false}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create negotiation session
INSERT INTO negotiation_sessions (
  id,
  proposal_id,
  project_id,
  initiator_id,
  consultant_advisor_id,
  status,
  target_total,
  initiator_message,
  created_at,
  updated_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-priceneg0001',
  'aaaaaaaa-aaaa-aaaa-aaaa-priceprp0002',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001',
  'affcee25-5666-438a-a4bc-136d106f59ba',
  'awaiting_response',
  30000,
  'מבקש הפחתה במחיר הכולל ל-30,000 ₪',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- Update invite status
UPDATE rfp_invites 
SET status = 'submitted' 
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-priceinv0002';

-- =============================================================================
-- STEP 6: Scenario D - Accepted proposal (locked final)
-- Using existing accepted proposal: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004
-- =============================================================================
-- No new insert needed - we already have an accepted proposal

-- =============================================================================
-- STEP 7: Legacy percent-based record (negative test case)
-- =============================================================================
-- Insert a fee item with unit='percentage' to test backward compatibility
-- This should render safely but not be submittable in new proposals

-- Add a legacy percent item to an existing proposal's JSONB for display testing
-- We'll add it to a comment field to avoid breaking the proposal
-- Actually, let's create a dedicated test record

INSERT INTO proposals (
  id,
  project_id,
  advisor_id,
  rfp_invite_id,
  supplier_name,
  price,
  currency,
  timeline_days,
  scope_text,
  status,
  submitted_at,
  declaration_text,
  signature_blob,
  signature_meta_json,
  fee_line_items
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-priceleg0001',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'c7b93dfd-58f6-43d8-aabf-5cce18f3119d',
  'aaaaaaaa-aaaa-aaaa-aaaa-priceinv0001',
  'TEST_ONLY__LEGACY Percent Record',
  5000,
  'ILS',
  30,
  'LEGACY: הצעה עם אחוזים - לבדיקת תאימות לאחור בלבד',
  'withdrawn', -- Marked as withdrawn so it wont interfere with active flows
  NOW() - INTERVAL '90 days',
  'אישור לגאסי',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  '{"timestamp": "2025-11-01T12:00:00Z", "content_hash": "legacy-hash", "legacy_percent_test": true}',
  '[
    {"id": "fee-legacy-1", "item_number": 1, "description": "עמלה באחוזים - לגאסי", "unit": "percentage", "quantity": 5, "unit_price": 1000, "charge_type": "one_time", "is_optional": false, "legacy_percent_value": 5},
    {"id": "fee-legacy-2", "item_number": 2, "description": "שירות רגיל", "unit": "lump_sum", "quantity": 1, "unit_price": 5000, "charge_type": "one_time", "is_optional": false}
  ]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  fee_line_items = EXCLUDED.fee_line_items,
  signature_meta_json = EXCLUDED.signature_meta_json;

-- =============================================================================
-- STEP 8: Summary output
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'SEED COMPLETE: Fixed Currency Pricing Test Data';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'RFP: aaaaaaaa-aaaa-aaaa-aaaa-pricerfp0001';
  RAISE NOTICE '';
  RAISE NOTICE 'Scenario A (Draft): Use UI - do not submit';
  RAISE NOTICE 'Scenario B (Submitted/Locked): aaaaaaaa-aaaa-aaaa-aaaa-priceprp0001';
  RAISE NOTICE 'Scenario C (Negotiation): aaaaaaaa-aaaa-aaaa-aaaa-priceprp0002';
  RAISE NOTICE '  - Session: aaaaaaaa-aaaa-aaaa-aaaa-priceneg0001';
  RAISE NOTICE 'Scenario D (Accepted): aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004';
  RAISE NOTICE 'Legacy Percent: aaaaaaaa-aaaa-aaaa-aaaa-priceleg0001';
  RAISE NOTICE '=====================================================';
END $$;

COMMIT;
```

---

## Section 2: QA Testing Instructions

### Prerequisites
- Run the SQL seed script above via Supabase SQL Editor
- Ensure all test accounts have password: `TestPassword123!`

### UI Checklist

#### Test 1: Verify No Percent Option in Fee Table

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `vendor.test+billding@example.com` | Dashboard loads |
| 2 | Navigate to RFP invites | See `TEST_ONLY__בדיקת תמחור ₪` |
| 3 | Click "הגש הצעה" (Submit Proposal) | Proposal form opens |
| 4 | Navigate to "שכר טרחה" (Fees) tab | Fee table displays |
| 5 | Click "הוסף פריט" (Add Item) | New row appears |
| 6 | Check unit dropdown options | Should NOT contain "%" or "אחוז" option. Only: קומפ', מ"ר, יח', ש"ע, לי"ע, לקומה |
| 7 | Inspect price input field | Shows ₪ symbol, accepts only numeric input |

#### Test 2: Reject Percent Text Input

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In price field, type `10%` | Only "10" appears (% stripped) |
| 2 | Try pasting `15%` | Only "15" appears |
| 3 | Try pasting `10 percent` | Only "10" appears |
| 4 | Fill all required fields with valid ₪ amounts | Form validates |
| 5 | Submit proposal | Success - redirects to dashboard |

#### Test 3: Submitted Proposal Locked

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As `vendor.test+billding@example.com` | Already logged in |
| 2 | Go to "ההצעות שלי" (My Proposals) | See submitted proposal |
| 3 | Click on proposal `priceprp0001` | Detail view opens |
| 4 | Check for edit buttons | No edit/modify options visible |
| 5 | Price shows as ₪25,000 | Fixed currency display |

#### Test 4: Negotiation Flow - Revised Offer

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `vendor.test1+billding@example.com` | Dashboard loads |
| 2 | Navigate to "משא ומתן" (Negotiations) tab | See active negotiation |
| 3 | Click on negotiation for proposal `priceprp0002` | Negotiation view opens |
| 4 | See entrepreneur's request: "הפחתה ל-30,000 ₪" | Request visible |
| 5 | Modify line item prices (use ₪ amounts only) | Prices update |
| 6 | Try entering `10%` in any price field | Rejected/stripped |
| 7 | Enter valid ₪ amount (e.g., 28000) | Accepted |
| 8 | Submit revised offer | Success - status updates |

#### Test 5: Accepted Proposal Locked Final

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `entrepreneur.test+billding@example.com` | Dashboard loads |
| 2 | Navigate to project `TEST_ONLY__Sandbox Project 001` | Project detail opens |
| 3 | Go to "הצעות" (Proposals) tab | See accepted proposal |
| 4 | Click on accepted proposal | Detail view shows |
| 5 | Verify no edit options | Fully locked |
| 6 | Price displayed as ₪85,000 | Fixed currency |

#### Test 6: Legacy Percent Record Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As entrepreneur, view proposal list | See "LEGACY" proposal |
| 2 | Open legacy proposal detail | Renders without error |
| 3 | Fee table shows "%" unit | Displayed correctly |
| 4 | Status shows "withdrawn" | Not active |

---

### API Checklist

#### Endpoint: Proposal Submission

**Positive Test - Fixed Amount (Expected: 200 OK)**
```bash
curl -X POST 'https://[PROJECT_REF].supabase.co/rest/v1/proposals' \
  -H 'Authorization: Bearer [VENDOR_JWT]' \
  -H 'Content-Type: application/json' \
  -H 'apikey: [ANON_KEY]' \
  -d '{
    "project_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004",
    "advisor_id": "c7b93dfd-58f6-43d8-aabf-5cce18f3119d",
    "price": 25000,
    "currency": "ILS",
    "timeline_days": 60,
    "scope_text": "Valid fixed price proposal",
    "fee_line_items": [
      {"description": "Service A", "unit": "lump_sum", "quantity": 1, "unit_price": 25000}
    ]
  }'
```
**Assertions:**
- Response status: 201 Created
- `price` field in response is numeric (25000)
- `currency` field is "ILS"

**Negative Test - Percent in Fee Items (Expected: 400 or validation error)**
```bash
curl -X POST 'https://[PROJECT_REF].supabase.co/rest/v1/proposals' \
  -H 'Authorization: Bearer [VENDOR_JWT]' \
  -H 'Content-Type: application/json' \
  -H 'apikey: [ANON_KEY]' \
  -d '{
    "project_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004",
    "advisor_id": "c7b93dfd-58f6-43d8-aabf-5cce18f3119d",
    "price": 5000,
    "currency": "ILS",
    "timeline_days": 30,
    "scope_text": "Invalid percent proposal",
    "fee_line_items": [
      {"description": "Commission", "unit": "percentage", "quantity": 10, "unit_price": 500}
    ]
  }'
```
**Assertions:**
- Response status: 400 Bad Request (if server validation exists)
- OR: 201 but with `unit` value sanitized to non-percentage type
- Error message should indicate percent pricing not allowed

#### Endpoint: Negotiation Response

**Positive Test - Fixed Amount Response (Expected: 200 OK)**
```bash
curl -X POST 'https://[PROJECT_REF].supabase.co/functions/v1/send-negotiation-response' \
  -H 'Authorization: Bearer [VENDOR2_JWT]' \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "aaaaaaaa-aaaa-aaaa-aaaa-priceneg0001",
    "consultant_message": "Revised to ₪30,000",
    "updated_line_items": [
      {"line_item_id": "fee-neg-1", "consultant_response_price": 18000},
      {"line_item_id": "fee-neg-2", "consultant_response_price": 12000}
    ]
  }'
```
**Assertions:**
- Response status: 200 OK
- `new_version_number` in response is 2
- Total price calculated as 18000 + 12000 = 30000

**Negative Test - Percent in Response (Expected: 400)**
```bash
curl -X POST 'https://[PROJECT_REF].supabase.co/functions/v1/send-negotiation-response' \
  -H 'Authorization: Bearer [VENDOR2_JWT]' \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "aaaaaaaa-aaaa-aaaa-aaaa-priceneg0001",
    "consultant_message": "5% discount",
    "updated_line_items": [
      {"line_item_id": "fee-neg-1", "consultant_response_price": "5%"}
    ]
  }'
```
**Assertions:**
- Response status: 400 Bad Request
- Error message indicates invalid price format

---

### Acceptance Criteria Summary

| Criterion | Validation Method |
|-----------|-------------------|
| Seed creates one reliable test RFP | SQL seed runs without errors |
| RFP linked to existing TEST users | Invites reference correct advisor_ids |
| QA can validate Scenarios A-D | All UI tests pass |
| Percent pricing blocked in UI | No % option in dropdowns, % stripped from input |
| Percent pricing rejected at API | 400 response or sanitization on percent payloads |
| Legacy percent records render safely | No UI crash on legacy data |
| Legacy percent cannot be resubmitted | Proposal marked withdrawn, no edit options |

---

## Technical Notes

### Database IDs Used (Deterministic)
- RFP: `aaaaaaaa-aaaa-aaaa-aaaa-pricerfp0001`
- Invite 1: `aaaaaaaa-aaaa-aaaa-aaaa-priceinv0001`
- Invite 2: `aaaaaaaa-aaaa-aaaa-aaaa-priceinv0002`
- Submitted Proposal: `aaaaaaaa-aaaa-aaaa-aaaa-priceprp0001`
- Negotiation Proposal: `aaaaaaaa-aaaa-aaaa-aaaa-priceprp0002`
- Negotiation Session: `aaaaaaaa-aaaa-aaaa-aaaa-priceneg0001`
- Version 1: `aaaaaaaa-aaaa-aaaa-aaaa-pricever0001`
- Legacy Percent: `aaaaaaaa-aaaa-aaaa-aaaa-priceleg0001`

### Price Storage Convention
- All prices stored as `numeric` type in database
- Currency stored separately in `currency` column (default: 'ILS')
- Fee items store `unit_price` as numeric, not strings
- Display format: `₪{price.toLocaleString('he-IL')}`

### Cleanup Script (Optional)
```sql
-- Remove test data created by this seed
DELETE FROM negotiation_sessions WHERE id LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-priceneg%';
DELETE FROM proposal_versions WHERE id LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-pricever%';
DELETE FROM proposals WHERE id LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-priceprp%' OR id LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-priceleg%';
DELETE FROM rfp_invites WHERE id LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-priceinv%';
DELETE FROM rfps WHERE id LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-pricerfp%';
```

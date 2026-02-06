

# Test Data Seeding for Milestone & Payment Terms Flow

## Overview

Create comprehensive SQL seed data for testing the milestone change window and payment terms UX flow. The test data will cover all states in the proposal lifecycle: pre-submission (editable), submitted (locked), and negotiation (limited changes).

---

## 1. Test Data Requirements

Based on the UX specification and image reference, we need test data for:

| Scenario | RFP Invite Status | Proposal Status | Milestones | Payment Terms |
|----------|-------------------|-----------------|------------|---------------|
| **Pre-Submission** | `opened` | None | Editable by consultant | שוטף +30, 5 milestones |
| **Submitted** | `submitted` | `submitted` | Locked (read-only) | שוטף +30, consultant adjustments |
| **Negotiation Active** | `submitted` | `negotiation_requested` | Percentages editable | Original terms visible |
| **Accepted** | `submitted` | `accepted` | Fully locked | Final approved terms |

---

## 2. Data Structure

### 2.1 Payment Terms (rfp_invites.payment_terms)

```json
{
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
}
```

### 2.2 Consultant Milestone Adjustments (proposals.milestone_adjustments)

```json
[
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
]
```

---

## 3. Migration Script

Create a new SQL migration file to seed comprehensive test data:

### File: `supabase/migrations/YYYYMMDDHHMMSS_seed_milestone_test_data.sql`

```sql
-- Test Data for Milestone & Payment Terms Flow Testing
-- Uses existing TEST_ONLY__ project and advisors

-- 1. Create a new RFP for milestone testing
INSERT INTO rfps (id, project_id, subject, body_html, sent_at)
VALUES (
  'aaaaaaaa-test-mile-0001-000000000001',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004', -- TEST_ONLY__Sandbox Project 001
  'בקשה להצעת מחיר - בדיקת אבני דרך',
  '<p>בקשה לבדיקת תהליך אבני דרך ותנאי תשלום</p>',
  now()
);

-- 2. Create RFP invite with full milestone data (Pre-submission scenario)
INSERT INTO rfp_invites (
  id, rfp_id, email, advisor_id, advisor_type, status,
  submit_token, deadline_at, payment_terms,
  request_title, request_content
)
VALUES (
  'aaaaaaaa-test-mile-0002-000000000001',
  'aaaaaaaa-test-mile-0001-000000000001',
  'vendor.test+billding@example.com',
  'c7b93dfd-58f6-43d8-aabf-5cce18f3119d', -- TEST_ONLY__Vendor Consulting Ltd
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
);

-- 3. Create second invite with proposal (Submitted scenario - locked)
INSERT INTO rfp_invites (
  id, rfp_id, email, advisor_id, advisor_type, status,
  submit_token, deadline_at, payment_terms,
  request_title, request_content
)
VALUES (
  'aaaaaaaa-test-mile-0002-000000000002',
  'aaaaaaaa-test-mile-0001-000000000001',
  'vendor.test1+billding@example.com',
  'affcee25-5666-438a-a4bc-136d106f59ba', -- TEST_ONLY__Vendor Consulting 2 Ltd
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
);

-- 4. Create proposal with milestone adjustments (Submitted - Locked scenario)
INSERT INTO proposals (
  id, project_id, advisor_id, rfp_invite_id,
  supplier_name, price, timeline_days,
  status, submitted_at,
  milestone_adjustments,
  conditions_json,
  scope_text
)
VALUES (
  'aaaaaaaa-test-mile-0003-000000000001',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'affcee25-5666-438a-a4bc-136d106f59ba', -- TEST_ONLY__Vendor Consulting 2 Ltd
  'aaaaaaaa-test-mile-0002-000000000002',
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
  'שירותי ייעוץ מלאים הכוללים: תכנון ראשוני, הכנת מסמכים להגשה, ליווי מול הרשויות, פיקוח עליון'
);

-- 5. Create negotiation session for testing negotiation state
INSERT INTO negotiation_sessions (
  id, project_id, proposal_id, consultant_advisor_id,
  initiator_id, status, created_at,
  initiator_message, milestone_adjustments,
  target_reduction_percent
)
VALUES (
  'aaaaaaaa-test-mile-0004-000000000001',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'aaaaaaaa-test-mile-0003-000000000001',
  'affcee25-5666-438a-a4bc-136d106f59ba',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001', -- TEST_ONLY__ Entrepreneur
  'pending',
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
);
```

---

## 4. Test Scenarios Covered

| ID | Scenario | How to Test |
|----|----------|-------------|
| **1** | Pre-submission milestones editable | Login as `vendor.test+billding@example.com`, open invite `aaaaaaaa-test-mile-0002-000000000001` |
| **2** | Post-submission locked | Login as `vendor.test1+billding@example.com`, view proposal `aaaaaaaa-test-mile-0003-000000000001` |
| **3** | Negotiation active | Same as #2, negotiation session exists |
| **4** | Entrepreneur view | Login as project owner, view proposals with milestone adjustments |

---

## 5. Cleanup Script (Optional)

```sql
-- To remove test data after testing
DELETE FROM negotiation_sessions WHERE id = 'aaaaaaaa-test-mile-0004-000000000001';
DELETE FROM proposals WHERE id = 'aaaaaaaa-test-mile-0003-000000000001';
DELETE FROM rfp_invites WHERE rfp_id = 'aaaaaaaa-test-mile-0001-000000000001';
DELETE FROM rfps WHERE id = 'aaaaaaaa-test-mile-0001-000000000001';
```

---

## 6. Expected Outcomes

After running the migration:

1. **Vendor 1** (`vendor.test+billding@example.com`) will see:
   - RFP invite with 5 pre-defined milestones from entrepreneur
   - Editable milestone table with "Change Window" alert
   - Can add/modify milestones before submission

2. **Vendor 2** (`vendor.test1+billding@example.com`) will see:
   - Submitted proposal with milestone adjustments visible
   - "Locked after submission" badge
   - Active negotiation request from entrepreneur

3. **Entrepreneur** (project owner) will see:
   - Proposal comparison with consultant's milestone adjustments
   - Ability to request negotiation on percentages
   - Clear indication of original vs consultant-modified milestones

---

## 7. Implementation Files

| # | File | Action |
|---|------|--------|
| 1 | `supabase/migrations/[timestamp]_seed_milestone_test_data.sql` | **Create** - SQL seed script |

---

## 8. Test Credentials (from memory)

| Role | Email | Password |
|------|-------|----------|
| Test Vendor 1 | `vendor.test+billding@example.com` | `Billding2026!` |
| Test Vendor 2 | `vendor.test1+billding@example.com` | `TestPassword123!` |


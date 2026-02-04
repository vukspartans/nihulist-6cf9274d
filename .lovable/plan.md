
# Seed Additional Test Vendor for Offer Comparison Testing

## Summary
Create a second isolated test vendor in the production database to enable testing of multiple offer comparison for the same RFP. This is a **data seeding task only** - no code changes.

---

## Existing Test Vendor Pattern Analysis

The existing test vendor (`vendor.test+billding@example.com`) follows this isolation pattern:

| Table | Isolation Mechanism |
|-------|---------------------|
| `auth.users` | Deterministic UUID prefix (`aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002`) |
| `profiles` | `TEST_ONLY__` prefix in `name` and `company_name` fields |
| `advisors` | `TEST_ONLY__` prefix in `company_name`, `admin_approved: true`, `is_active: true` |
| `user_roles` | Standard `advisor` role assigned |

The `TEST_ONLY__` prefix ensures:
- Test users are excluded from analytics queries (filter by prefix)
- Test users are visually identifiable in admin panels
- Test users don't appear in public advisor listings (filtered by name pattern)

---

## New Vendor Configuration

| Field | Value |
|-------|-------|
| **Email** | `vendor.test1+billding@example.com` |
| **Password** | `TestPassword123!` |
| **User ID** | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003` (deterministic, follows pattern) |
| **Name** | `TEST_ONLY__Vendor Seed 2` |
| **Company Name** | `TEST_ONLY__Vendor Consulting 2 Ltd` |
| **Expertise** | `יועץ בדיקות (TEST)` (same as existing test vendor) |

---

## SQL Seeding Script

The following SQL must be executed via the Supabase SQL Editor:

```sql
-- ============================================
-- SEED NEW TEST VENDOR FOR OFFER COMPARISON
-- ============================================
-- New vendor: vendor.test1+billding@example.com
-- UUID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003
-- Follows exact same isolation pattern as existing test vendor
-- ============================================

DO $$
DECLARE
  v_user_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003';
  v_advisor_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0013';
  v_profile_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0023';
  v_role_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0033';
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Create auth.users entry
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'vendor.test1+billding@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    v_now,
    v_now,
    v_now,
    '',
    '',
    '',
    'authenticated',
    'authenticated',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'name', 'TEST_ONLY__Vendor Seed 2',
      'company_name', 'TEST_ONLY__Vendor Consulting 2 Ltd',
      'role', 'advisor',
      'tos_accepted', true,
      'tos_version', '1.0'
    )
  );

  -- 2. Create profile entry
  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    name,
    company_name,
    phone,
    role,
    admin_approved,
    requires_password_change,
    tos_accepted_at,
    tos_version,
    created_at,
    updated_at
  ) VALUES (
    v_profile_id,
    v_user_id,
    'vendor.test1+billding@example.com',
    'TEST_ONLY__Vendor Seed 2',
    'TEST_ONLY__Vendor Consulting 2 Ltd',
    '+972321321313',
    'advisor',
    false,
    false,
    v_now,
    '1.0',
    v_now,
    v_now
  );

  -- 3. Create advisors entry
  INSERT INTO public.advisors (
    id,
    user_id,
    company_name,
    expertise,
    specialties,
    activity_regions,
    location,
    is_active,
    admin_approved,
    availability_status,
    office_size,
    founding_year,
    position_in_office,
    cover_image_url,
    rating,
    certifications,
    created_at,
    updated_at
  ) VALUES (
    v_advisor_id,
    v_user_id,
    'TEST_ONLY__Vendor Consulting 2 Ltd',
    ARRAY['יועץ בדיקות (TEST)'],
    ARRAY['תמ"א 38/1 – חיזוק ותוספות', 'פינוי־בינוי (מתחמים)'],
    ARRAY['חיפה והסביבה', 'גוש דן', 'ירושלים והסביבה', 'הצפון'],
    'Test',
    true,
    true,
    'available',
    'קטן - 3-5 עובדים',
    2026,
    'Test',
    '1',
    ARRAY[]::text[],
    v_now,
    v_now
  );

  -- 4. Create user_roles entry
  INSERT INTO public.user_roles (
    id,
    user_id,
    role,
    created_at
  ) VALUES (
    v_role_id,
    v_user_id,
    'advisor',
    v_now
  );

  RAISE NOTICE 'Test vendor 2 created successfully!';
  RAISE NOTICE 'Email: vendor.test1+billding@example.com';
  RAISE NOTICE 'Password: TestPassword123!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Advisor ID: %', v_advisor_id;
END $$;
```

---

## Verification Queries

After seeding, run these queries to verify:

```sql
-- Verify user creation
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003';

-- Verify profile
SELECT user_id, name, role, email 
FROM public.profiles 
WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003';

-- Verify advisor
SELECT id, user_id, company_name, is_active, admin_approved, expertise 
FROM public.advisors 
WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003';

-- Verify role
SELECT * FROM public.user_roles 
WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003';

-- Verify both test vendors exist and are distinct
SELECT 
  a.id as advisor_id,
  a.company_name,
  p.email,
  p.name
FROM public.advisors a
JOIN public.profiles p ON p.user_id = a.user_id
WHERE a.company_name LIKE 'TEST_ONLY__%';
```

---

## Isolation Guarantees

| Concern | How It's Handled |
|---------|------------------|
| **Analytics** | `TEST_ONLY__` prefix allows filtering in queries |
| **Public listings** | Same expertise type groups both test vendors together for RFP invites |
| **Notifications/Emails** | No notification triggers fire on direct SQL inserts |
| **Billing** | No billing integration with advisor records |
| **Identity separation** | Distinct `user_id`, `advisor_id`, and `email` |

---

## Testing Workflow

After seeding:

1. **Login Test**: Navigate to `/auth` and login with `vendor.test1+billding@example.com` / `TestPassword123!`
2. **RFP Invite Test**: From entrepreneur test account, send RFP invite to both test vendors for same project
3. **Offer Submission**: Both vendors submit separate proposals
4. **Comparison Test**: Entrepreneur views proposal comparison table with both offers

---

## Execution Steps

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/aazakceyruefejeyhkbk/sql/new
2. Paste the seeding SQL script
3. Execute the script
4. Run verification queries to confirm
5. Test login with new credentials

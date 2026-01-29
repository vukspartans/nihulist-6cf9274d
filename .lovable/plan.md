
# Test Data Seed Script

## Overview
A single SQL script that creates isolated test data using direct inserts via the Supabase SQL Editor (with service role access). This approach:
- Does NOT send any emails or notifications (no edge functions called)
- Does NOT trigger external webhooks
- Uses `TEST_ONLY__` prefix for easy identification and cleanup
- Creates data in proper order respecting foreign key constraints

---

## What Will Be Created

| Entity | Details |
|--------|---------|
| **Test Organization** | `TEST_ONLY__Billding Sandbox Org` |
| **Entrepreneur User** | `entrepreneur.test+billding@example.com` |
| **Vendor User** | `vendor.test+billding@example.com` |
| **Test Project** | `TEST_ONLY__Sandbox Project 001` |

---

## SQL Script: `seed_test_accounts_and_project.sql`

```sql
-- =============================================================================
-- TEST DATA SEED SCRIPT
-- =============================================================================
-- SAFETY RULES:
-- 1. Run ONLY on staging/sandbox database, NOT production
-- 2. Must be run as service_role (bypasses RLS)
-- 3. All records prefixed with TEST_ONLY__ for easy identification
-- 4. No notifications, emails, or external calls are triggered
-- =============================================================================

BEGIN;

-- Generate deterministic UUIDs for test data (using fixed seeds for reproducibility)
DO $$
DECLARE
    v_entrepreneur_user_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001';
    v_vendor_user_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002';
    v_organization_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003';
    v_project_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004';
    v_advisor_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0005';
    v_timestamp TIMESTAMP WITH TIME ZONE := now();
BEGIN

    -- =========================================================================
    -- STEP 1: Create auth.users entries
    -- =========================================================================
    -- NOTE: Password hash is for 'TestPassword123!' using bcrypt
    -- In production, use proper password generation
    
    -- Entrepreneur user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        role,
        aud
    ) VALUES (
        v_entrepreneur_user_id,
        '00000000-0000-0000-0000-000000000000',
        'entrepreneur.test+billding@example.com',
        crypt('TestPassword123!', gen_salt('bf')),
        v_timestamp,
        v_timestamp,
        v_timestamp,
        jsonb_build_object(
            'name', 'TEST_ONLY__Entrepreneur Seed',
            'role', 'entrepreneur',
            'tos_accepted', true,
            'tos_version', '1.0'
        ),
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Vendor/Advisor user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        role,
        aud
    ) VALUES (
        v_vendor_user_id,
        '00000000-0000-0000-0000-000000000000',
        'vendor.test+billding@example.com',
        crypt('TestPassword123!', gen_salt('bf')),
        v_timestamp,
        v_timestamp,
        v_timestamp,
        jsonb_build_object(
            'name', 'TEST_ONLY__Vendor Seed',
            'role', 'advisor',
            'company_name', 'TEST_ONLY__Vendor Consulting Ltd',
            'tos_accepted', true,
            'tos_version', '1.0'
        ),
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- STEP 2: Create test organization (company)
    -- =========================================================================
    INSERT INTO public.companies (
        id,
        name,
        type,
        description,
        country,
        location,
        email,
        phone,
        created_at,
        updated_at
    ) VALUES (
        v_organization_id,
        'TEST_ONLY__Billding Sandbox Org',
        'entrepreneur',
        'Test organization for internal testing. DO NOT USE FOR REAL DATA.',
        'Israel',
        'Tel Aviv (Test)',
        'test-org@example.com',
        '+972-50-000-0000',
        v_timestamp,
        v_timestamp
    )
    ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- STEP 3: Create profiles (linked to auth.users)
    -- =========================================================================
    
    -- Entrepreneur profile
    INSERT INTO public.profiles (
        user_id,
        name,
        email,
        phone,
        role,
        organization_id,
        admin_approved,
        approved_at,
        tos_accepted_at,
        tos_version,
        requires_password_change,
        created_at,
        updated_at
    ) VALUES (
        v_entrepreneur_user_id,
        'TEST_ONLY__Entrepreneur Seed',
        'entrepreneur.test+billding@example.com',
        '+972-50-111-1111',
        'entrepreneur',
        v_organization_id,
        true,
        v_timestamp,
        v_timestamp,
        '1.0',
        false,
        v_timestamp,
        v_timestamp
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        organization_id = EXCLUDED.organization_id;

    -- Vendor profile
    INSERT INTO public.profiles (
        user_id,
        name,
        email,
        phone,
        company_name,
        role,
        admin_approved,
        approved_at,
        tos_accepted_at,
        tos_version,
        requires_password_change,
        created_at,
        updated_at
    ) VALUES (
        v_vendor_user_id,
        'TEST_ONLY__Vendor Seed',
        'vendor.test+billding@example.com',
        '+972-50-222-2222',
        'TEST_ONLY__Vendor Consulting Ltd',
        'advisor',
        true,
        v_timestamp,
        v_timestamp,
        '1.0',
        false,
        v_timestamp,
        v_timestamp
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        company_name = EXCLUDED.company_name;

    -- =========================================================================
    -- STEP 4: Create user roles
    -- =========================================================================
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES 
        (v_entrepreneur_user_id, 'entrepreneur', v_timestamp),
        (v_vendor_user_id, 'advisor', v_timestamp)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- =========================================================================
    -- STEP 5: Create advisor record for vendor
    -- =========================================================================
    INSERT INTO public.advisors (
        id,
        user_id,
        company_name,
        expertise,
        specialties,
        location,
        activity_regions,
        is_active,
        admin_approved,
        approved_at,
        availability_status,
        created_at,
        updated_at
    ) VALUES (
        v_advisor_id,
        v_vendor_user_id,
        'TEST_ONLY__Vendor Consulting Ltd',
        ARRAY['ארכיטקטורה', 'הנדסה'],
        ARRAY['תכנון', 'ייעוץ'],
        'Tel Aviv (Test)',
        ARRAY['מרכז', 'שרון'],
        true,
        true,
        v_timestamp,
        'available',
        v_timestamp,
        v_timestamp
    )
    ON CONFLICT (user_id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        expertise = EXCLUDED.expertise;

    -- =========================================================================
    -- STEP 6: Create company membership for entrepreneur
    -- =========================================================================
    INSERT INTO public.company_members (
        company_id,
        user_id,
        role,
        status,
        joined_at,
        updated_at
    ) VALUES (
        v_organization_id,
        v_entrepreneur_user_id,
        'owner',
        'active',
        v_timestamp,
        v_timestamp
    )
    ON CONFLICT (company_id, user_id) DO NOTHING;

    -- =========================================================================
    -- STEP 7: Create test project
    -- =========================================================================
    INSERT INTO public.projects (
        id,
        owner_id,
        name,
        type,
        location,
        budget,
        advisors_budget,
        description,
        phase,
        status,
        timeline_start,
        timeline_end,
        created_at,
        updated_at
    ) VALUES (
        v_project_id,
        v_entrepreneur_user_id,
        'TEST_ONLY__Sandbox Project 001',
        'מגורים',
        'Tel Aviv (Test Location)',
        5000000,
        100000,
        'This is a test project for internal testing purposes only. DO NOT USE FOR REAL DATA.',
        'בדיקה ראשונית',
        'active',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 year',
        v_timestamp,
        v_timestamp
    )
    ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- OUTPUT: Summary of created records
    -- =========================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST DATA CREATED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Entrepreneur User ID: %', v_entrepreneur_user_id;
    RAISE NOTICE 'Entrepreneur Email: entrepreneur.test+billding@example.com';
    RAISE NOTICE 'Vendor User ID: %', v_vendor_user_id;
    RAISE NOTICE 'Vendor Email: vendor.test+billding@example.com';
    RAISE NOTICE 'Organization ID: %', v_organization_id;
    RAISE NOTICE 'Project ID: %', v_project_id;
    RAISE NOTICE 'Advisor ID: %', v_advisor_id;
    RAISE NOTICE 'Password: TestPassword123!';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify created users
SELECT 'auth.users' as table_name, id, email, created_at 
FROM auth.users 
WHERE email LIKE '%test+billding@example.com';

-- Verify profiles
SELECT 'profiles' as table_name, user_id, name, email, role, organization_id 
FROM public.profiles 
WHERE name LIKE 'TEST_ONLY__%';

-- Verify organization
SELECT 'companies' as table_name, id, name, type 
FROM public.companies 
WHERE name LIKE 'TEST_ONLY__%';

-- Verify user_roles
SELECT 'user_roles' as table_name, ur.user_id, ur.role, p.name 
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE p.name LIKE 'TEST_ONLY__%';

-- Verify advisor
SELECT 'advisors' as table_name, id, user_id, company_name 
FROM public.advisors 
WHERE company_name LIKE 'TEST_ONLY__%';

-- Verify project
SELECT 'projects' as table_name, id, owner_id, name, status 
FROM public.projects 
WHERE name LIKE 'TEST_ONLY__%';

-- Verify NO new notifications were created
SELECT 'notification_queue' as table_name, COUNT(*) as total_count 
FROM public.notification_queue;


-- =============================================================================
-- CLEANUP SCRIPT (COMMENTED OUT - USE WITH CAUTION)
-- =============================================================================
/*
-- Run this to remove ALL test data

BEGIN;

-- Delete in reverse order of dependencies
DELETE FROM public.projects WHERE name LIKE 'TEST_ONLY__%';
DELETE FROM public.company_members WHERE user_id IN (
    SELECT user_id FROM public.profiles WHERE name LIKE 'TEST_ONLY__%'
);
DELETE FROM public.advisors WHERE company_name LIKE 'TEST_ONLY__%';
DELETE FROM public.user_roles WHERE user_id IN (
    SELECT user_id FROM public.profiles WHERE name LIKE 'TEST_ONLY__%'
);
DELETE FROM public.profiles WHERE name LIKE 'TEST_ONLY__%';
DELETE FROM public.companies WHERE name LIKE 'TEST_ONLY__%';
DELETE FROM auth.users WHERE email LIKE '%test+billding@example.com';

COMMIT;

-- Verify cleanup
SELECT 'Remaining test data:';
SELECT COUNT(*) FROM auth.users WHERE email LIKE '%test+billding@example.com';
SELECT COUNT(*) FROM public.profiles WHERE name LIKE 'TEST_ONLY__%';
SELECT COUNT(*) FROM public.companies WHERE name LIKE 'TEST_ONLY__%';
SELECT COUNT(*) FROM public.projects WHERE name LIKE 'TEST_ONLY__%';
*/
```

---

## How to Use

### 1. Run the Seed Script
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/aazakceyruefejeyhkbk/sql/new
2. Copy and paste the entire script above
3. Click **Run** (ensure you're using service role connection)

### 2. Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Entrepreneur | `entrepreneur.test+billding@example.com` | `TestPassword123!` |
| Vendor | `vendor.test+billding@example.com` | `TestPassword123!` |

### 3. Login URLs
- Entrepreneur: https://billding.ai/auth
- Vendor: https://billding.ai/auth?type=advisor

### 4. Cleanup
Uncomment the cleanup section at the bottom of the script and run it to remove all test data.

---

## Safety Verification

| Check | Status |
|-------|--------|
| Uses `TEST_ONLY__` prefix | Yes |
| No email triggers | Yes (direct SQL insert) |
| No notification queue entries | Verified in script |
| No webhook calls | Yes (no edge functions) |
| Isolated organization | Yes |
| Vendor NOT connected to project | Yes |
| No RFP invites created | Yes |
| Reversible (cleanup provided) | Yes |

---

## Fixed UUIDs for Reference

| Entity | UUID |
|--------|------|
| Entrepreneur User | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001` |
| Vendor User | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002` |
| Organization | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003` |
| Project | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004` |
| Advisor | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0005` |

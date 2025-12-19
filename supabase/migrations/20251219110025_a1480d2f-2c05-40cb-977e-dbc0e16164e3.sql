-- Migration: Add entrepreneur organization fields to companies table

-- 1. Extend companies table with organization-specific fields
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Israel',
  ADD COLUMN IF NOT EXISTS founding_year INTEGER,
  ADD COLUMN IF NOT EXISTS employee_count TEXT,
  ADD COLUMN IF NOT EXISTS activity_categories JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS primary_activity_category TEXT,
  ADD COLUMN IF NOT EXISTS activity_scope TEXT,
  ADD COLUMN IF NOT EXISTS activity_scope_tier TEXT,
  ADD COLUMN IF NOT EXISTS activity_regions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_skipped_at TIMESTAMPTZ;

-- 2. Add organization_id to profiles table to link entrepreneurs to their organization
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_registration_number ON public.companies(registration_number);

-- 4. Add RLS policy for entrepreneurs to view their organization
CREATE POLICY "Entrepreneurs can view their organization"
  ON public.companies FOR SELECT
  USING (
    id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    OR id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  );

-- 5. Add RLS policy for entrepreneurs to update their organization
CREATE POLICY "Entrepreneurs can update their organization"
  ON public.companies FOR UPDATE
  USING (
    id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    OR is_company_owner(id, auth.uid())
  );

-- 6. Add RLS policy for entrepreneurs to insert their organization
CREATE POLICY "Entrepreneurs can insert their organization"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
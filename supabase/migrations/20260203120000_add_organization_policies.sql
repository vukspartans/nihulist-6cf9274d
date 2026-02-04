-- Migration: Add organization policy fields to companies table
-- Enables policy enforcement for offer evaluation (currency, payment terms, procurement rules)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS allowed_currencies TEXT[] DEFAULT ARRAY['ILS'],
  ADD COLUMN IF NOT EXISTS payment_terms_policy JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS procurement_rules JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_contract_clauses TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.companies.default_currency IS 'Default currency for organization (e.g. ILS, USD)';
COMMENT ON COLUMN public.companies.allowed_currencies IS 'Currencies organization accepts in proposals';
COMMENT ON COLUMN public.companies.payment_terms_policy IS 'Preferred payment terms structure (e.g. milestone-based, max upfront %)';
COMMENT ON COLUMN public.companies.procurement_rules IS 'Organization procurement rules and constraints';
COMMENT ON COLUMN public.companies.required_contract_clauses IS 'Mandatory contract clauses organization requires';

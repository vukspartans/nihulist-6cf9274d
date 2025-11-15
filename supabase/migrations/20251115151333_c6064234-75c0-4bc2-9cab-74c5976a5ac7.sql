-- Remove duplicate foreign key constraints that cause PostgREST embedding ambiguity

-- Drop duplicate constraint on rfp_invites.rfp_id -> rfps.id
-- Keep only rfp_invites_rfp_id_fkey, remove fk_rfp_invites_rfp
ALTER TABLE public.rfp_invites 
DROP CONSTRAINT IF EXISTS fk_rfp_invites_rfp;

-- Drop duplicate constraint on rfp_invites.advisor_id -> advisors.id
-- Keep only rfp_invites_advisor_id_fkey, remove fk_rfp_invites_advisor
ALTER TABLE public.rfp_invites 
DROP CONSTRAINT IF EXISTS fk_rfp_invites_advisor;

-- Verify remaining foreign keys (for documentation purposes)
-- Expected results:
-- rfp_invites_rfp_id_fkey: rfp_invites(rfp_id) -> rfps(id)
-- rfp_invites_advisor_id_fkey: rfp_invites(advisor_id) -> advisors(id)
-- rfp_invites_supplier_id_fkey: rfp_invites(supplier_id) -> suppliers(id)
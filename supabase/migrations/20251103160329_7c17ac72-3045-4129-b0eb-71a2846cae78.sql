-- Drop old unique constraints that block multi-expertise RFPs
-- The new constraint rfp_invites_rfp_id_advisor_id_type_key handles uniqueness correctly

DROP INDEX IF EXISTS public.idx_rfp_invites_rfp_advisor;
DROP INDEX IF EXISTS public.idx_rfp_invites_unique_advisor;
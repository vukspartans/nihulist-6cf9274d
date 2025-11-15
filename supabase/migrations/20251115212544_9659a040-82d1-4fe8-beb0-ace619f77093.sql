-- Add 'proposal_approval' to signatures entity_type check constraint
-- This allows the approve_proposal_atomic function to create signature records

-- Drop the existing check constraint
ALTER TABLE public.signatures
  DROP CONSTRAINT IF EXISTS signatures_entity_type_check;

-- Recreate with the additional 'proposal_approval' value
ALTER TABLE public.signatures
  ADD CONSTRAINT signatures_entity_type_check
  CHECK (entity_type IN ('proposal', 'agreement', 'amendment', 'proposal_approval'));

-- Add comment for clarity
COMMENT ON CONSTRAINT signatures_entity_type_check ON public.signatures IS 
  'Allowed entity types: proposal (signature on proposal doc), agreement (contract signature), amendment (change signature), proposal_approval (entrepreneur accepting a proposal)';
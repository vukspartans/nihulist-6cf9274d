-- Add missing columns to proposal_versions table to align with submit_negotiation_response function
-- The function expects fee_line_items and milestone_adjustments columns which don't exist

-- Add fee_line_items column (JSONB to store line item snapshots)
ALTER TABLE proposal_versions 
ADD COLUMN IF NOT EXISTS fee_line_items JSONB;

-- Add milestone_adjustments column (JSONB to store milestone payment schedule)
ALTER TABLE proposal_versions 
ADD COLUMN IF NOT EXISTS milestone_adjustments JSONB;

-- Add comment for documentation
COMMENT ON COLUMN proposal_versions.fee_line_items IS 'Snapshot of fee line items at this version';
COMMENT ON COLUMN proposal_versions.milestone_adjustments IS 'Snapshot of milestone payment schedule at this version';
-- Backfill existing empty version snapshots with fee_line_items from proposals
UPDATE proposal_versions pv
SET line_items = (
  SELECT p.fee_line_items 
  FROM proposals p 
  WHERE p.id = pv.proposal_id
)
WHERE (pv.line_items = '[]'::jsonb OR pv.line_items IS NULL)
  AND EXISTS (
    SELECT 1 FROM proposals p 
    WHERE p.id = pv.proposal_id 
    AND p.fee_line_items IS NOT NULL 
    AND p.fee_line_items != '[]'::jsonb
  );
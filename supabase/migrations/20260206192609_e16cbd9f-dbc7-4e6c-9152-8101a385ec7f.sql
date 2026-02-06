-- Add duration fields to rfp_request_fee_items for recurring payments
ALTER TABLE rfp_request_fee_items 
ADD COLUMN IF NOT EXISTS duration numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS duration_unit text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN rfp_request_fee_items.duration IS 'Number of periods for recurring payments (months/hours/visits)';
COMMENT ON COLUMN rfp_request_fee_items.duration_unit IS 'Unit type for duration: months, hours, visits, units';
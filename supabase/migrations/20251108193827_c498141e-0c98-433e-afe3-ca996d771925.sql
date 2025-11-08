-- Add notification timestamp columns to proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS entrepreneur_notified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS advisor_notified_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN proposals.entrepreneur_notified_at IS 'Timestamp when entrepreneur was notified of proposal submission';
COMMENT ON COLUMN proposals.advisor_notified_at IS 'Timestamp when advisor was notified of proposal approval/rejection';
-- Drop the old constraint FIRST
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Update any existing rows with old status values to 'active'
UPDATE projects SET status = 'active' 
WHERE status NOT IN ('active', 'deleted');

-- Add new constraint with correct values (active for live projects, deleted for soft-delete)
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'deleted'::text]));
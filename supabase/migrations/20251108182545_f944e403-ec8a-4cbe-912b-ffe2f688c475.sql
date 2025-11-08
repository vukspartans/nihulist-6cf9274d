-- Add requires_password_change column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS requires_password_change boolean DEFAULT false;

COMMENT ON COLUMN profiles.requires_password_change IS 
'Flag to force password change on first login (for bulk-created accounts)';

-- Add token_used_at column to rfp_invites for security
ALTER TABLE rfp_invites
  ADD COLUMN IF NOT EXISTS token_used_at timestamp with time zone DEFAULT NULL;
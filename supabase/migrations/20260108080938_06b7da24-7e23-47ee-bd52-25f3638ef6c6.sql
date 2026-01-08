-- Add files column to negotiation_sessions to persist uploaded files
ALTER TABLE negotiation_sessions 
ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;
-- Add milestone_adjustments column to negotiation_sessions
ALTER TABLE public.negotiation_sessions 
ADD COLUMN IF NOT EXISTS milestone_adjustments JSONB DEFAULT '[]'::jsonb;
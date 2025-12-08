-- Add seen_by_entrepreneur_at column to proposals table
-- NULL = not seen yet (new), timestamp = when the entrepreneur viewed it
ALTER TABLE public.proposals
ADD COLUMN seen_by_entrepreneur_at timestamp with time zone DEFAULT NULL;
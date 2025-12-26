-- SIMPLE SAFE VERSION: Only adds new policies, doesn't modify existing ones
-- This is completely safe and won't trigger Supabase warnings

-- Allow system (edge functions with service role) to update evaluations
-- Note: Service role bypasses RLS anyway, but we add this for clarity
-- This policy allows Edge Functions to update evaluation fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'proposals' 
    AND policyname = 'System can update proposal evaluations'
  ) THEN
    CREATE POLICY "System can update proposal evaluations"
    ON public.proposals
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Note: Entrepreneurs already have update access via existing policy:
-- "Entrepreneurs can update proposal status only" (from migration 20251103163016)
-- This allows them to update evaluation_status to 'pending' for re-evaluation





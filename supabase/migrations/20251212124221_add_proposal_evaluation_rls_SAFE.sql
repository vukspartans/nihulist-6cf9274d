-- SAFE VERSION: Only creates policies if they don't exist
-- This avoids DROP POLICY which Supabase flags as destructive

-- Allow system (edge functions with service role) to update evaluations
-- Note: Service role bypasses RLS, but we add explicit policy for clarity
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

-- Allow entrepreneurs to manually trigger re-evaluation (update status to 'pending')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'proposals' 
    AND policyname = 'Entrepreneurs can reset proposal evaluations'
  ) THEN
    CREATE POLICY "Entrepreneurs can reset proposal evaluations"
    ON public.proposals
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = proposals.project_id
        AND projects.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = proposals.project_id
        AND projects.owner_id = auth.uid()
      )
      AND (
        -- Only allow resetting status to 'pending', not modifying results
        NEW.evaluation_status = 'pending'
        OR (
          -- Allow other updates only if evaluation_result is not being changed
          NEW.evaluation_result = COALESCE((SELECT evaluation_result FROM public.proposals WHERE id = NEW.id), '{}'::jsonb)
        )
      )
    );
  END IF;
END $$;


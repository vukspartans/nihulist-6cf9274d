-- Step 1: Add RLS policy for advisors to insert activity logs
CREATE POLICY "Advisors can insert activity logs"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() 
  AND actor_type IN ('advisor', 'entrepreneur', 'system')
);

-- Step 2: Deduplicate rfp_invites before adding unique constraint
-- Keep the latest invite for each (rfp_id, advisor_id, advisor_type) triple
WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY rfp_id, advisor_id, advisor_type 
      ORDER BY created_at DESC
    ) AS rn
  FROM public.rfp_invites
  WHERE advisor_id IS NOT NULL
)
DELETE FROM public.rfp_invites
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);
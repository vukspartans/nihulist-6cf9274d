-- ============================================================================
-- CREATE ADVISOR STATISTICS VIEW
-- ============================================================================
-- This view calculates historical performance metrics for advisors
-- that can be used in AI evaluation to improve scoring accuracy.
--
-- Metrics included:
-- - total_proposals: Total number of proposals submitted
-- - accepted_proposals: Number of proposals that were accepted
-- - win_rate: Percentage of proposals accepted (0-100)
-- - total_projects: Total number of projects advisor worked on
-- - completed_projects: Number of projects completed successfully
-- - completion_rate: Percentage of projects completed (0-100)
-- - repeat_client_rate: Percentage of clients who hired advisor again
-- - avg_project_value: Average project value (ILS)
-- ============================================================================

CREATE OR REPLACE VIEW public.advisor_statistics AS
SELECT 
  a.id as advisor_id,
  
  -- Proposal statistics
  COUNT(DISTINCT p.id) as total_proposals,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'accepted') as accepted_proposals,
  ROUND(
    100.0 * COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'accepted') / 
    NULLIF(COUNT(DISTINCT p.id), 0), 
    2
  ) as win_rate,
  
  -- Project statistics
  COUNT(DISTINCT pa.project_id) as total_projects,
  COUNT(DISTINCT pa.project_id) FILTER (WHERE pa.status = 'completed') as completed_projects,
  COUNT(DISTINCT pa.project_id) FILTER (WHERE pa.status = 'terminated') as terminated_projects,
  ROUND(
    100.0 * COUNT(DISTINCT pa.project_id) FILTER (WHERE pa.status = 'completed') / 
    NULLIF(COUNT(DISTINCT pa.project_id), 0), 
    2
  ) as completion_rate,
  
  -- Repeat client rate (clients who hired advisor for multiple projects)
  -- Calculate: percentage of clients who hired advisor for >1 project
  ROUND(
    100.0 * (
      SELECT COUNT(DISTINCT repeat_clients.owner_id)
      FROM (
        SELECT p3.owner_id, COUNT(*) as project_count
        FROM project_advisors pa3
        JOIN projects p3 ON p3.id = pa3.project_id
        WHERE pa3.advisor_id = a.id
        GROUP BY p3.owner_id
        HAVING COUNT(*) > 1
      ) repeat_clients
    ) / 
    NULLIF(
      (SELECT COUNT(DISTINCT p3.owner_id) 
       FROM project_advisors pa3
       JOIN projects p3 ON p3.id = pa3.project_id
       WHERE pa3.advisor_id = a.id), 
      0
    ), 
    2
  ) as repeat_client_rate,
  
  -- Average project value
  ROUND(
    AVG(pa.fee_amount) FILTER (WHERE pa.fee_amount IS NOT NULL), 
    2
  ) as avg_project_value,
  
  -- Last project date
  MAX(pa.selected_at) as last_project_date,
  
  -- First project date
  MIN(pa.selected_at) as first_project_date

FROM public.advisors a
LEFT JOIN public.proposals p ON p.advisor_id = a.id
LEFT JOIN public.project_advisors pa ON pa.advisor_id = a.id
GROUP BY a.id;

-- Add comment
COMMENT ON VIEW public.advisor_statistics IS 
  'Historical performance metrics for advisors. Used in AI evaluation to improve scoring accuracy based on real platform performance.';

-- Grant access to authenticated users
GRANT SELECT ON public.advisor_statistics TO authenticated;

-- Create index for better performance (if needed)
-- Note: Views don't have indexes, but underlying tables should be indexed
-- CREATE INDEX IF NOT EXISTS idx_proposals_advisor_status ON public.proposals(advisor_id, status);
-- CREATE INDEX IF NOT EXISTS idx_project_advisors_advisor_status ON public.project_advisors(advisor_id, status);


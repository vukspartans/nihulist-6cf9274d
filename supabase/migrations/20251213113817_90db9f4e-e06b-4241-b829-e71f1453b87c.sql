-- Add AI analysis caching columns to proposals table
ALTER TABLE public.proposals 
  ADD COLUMN IF NOT EXISTS ai_analysis TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_summaries JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.proposals.ai_analysis IS 'Cached AI analysis comparing proposal to RFP requirements';
COMMENT ON COLUMN public.proposals.ai_analysis_generated_at IS 'Timestamp when AI analysis was generated, for cache invalidation';
COMMENT ON COLUMN public.proposals.file_summaries IS 'JSONB object with file names as keys and AI summaries as values';
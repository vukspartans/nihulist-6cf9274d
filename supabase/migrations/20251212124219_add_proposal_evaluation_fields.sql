-- Add evaluation result columns to proposals table
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS evaluation_result JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evaluation_score NUMERIC CHECK (evaluation_score >= 0 AND evaluation_score <= 100),
  ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'pending' 
    CHECK (evaluation_status IN ('pending', 'extracting', 'evaluating', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS evaluation_metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evaluation_rank INTEGER, -- Rank within batch (1 = best)
  ADD COLUMN IF NOT EXISTS evaluation_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS evaluation_error TEXT;

-- Add extracted text column (for OCR/text extraction results)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS extracted_text TEXT, -- Full text from PDF/DOCX files
  ADD COLUMN IF NOT EXISTS extracted_text_hash TEXT, -- SHA256 hash for deduplication
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_evaluation_status 
  ON public.proposals(evaluation_status) 
  WHERE evaluation_status IN ('pending', 'extracting', 'evaluating');

CREATE INDEX IF NOT EXISTS idx_proposals_evaluation_score 
  ON public.proposals(evaluation_score DESC NULLS LAST) 
  WHERE evaluation_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_project_evaluation 
  ON public.proposals(project_id, evaluation_status, evaluation_score DESC NULLS LAST);

-- Add comment for documentation
COMMENT ON COLUMN public.proposals.evaluation_result IS 
  'Structured JSON evaluation result from AI (validated with Zod schema)';
COMMENT ON COLUMN public.proposals.evaluation_score IS 
  'Final weighted score (0-100) calculated by AI evaluator';
COMMENT ON COLUMN public.proposals.evaluation_status IS 
  'Current status of evaluation pipeline: pending -> extracting -> evaluating -> completed';
COMMENT ON COLUMN public.proposals.extracted_text IS 
  'Full text extracted from proposal files (PDF/DOCX). May contain PII - consider redaction.';





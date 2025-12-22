-- Phase 3.6: Add structured data columns to proposals table
-- These columns store consultant's detailed responses to entrepreneur's RFP structure

-- Fee line items with consultant prices and comments
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS fee_line_items JSONB DEFAULT '[]'::jsonb;

-- Selected services from entrepreneur's checklist
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS selected_services JSONB DEFAULT '[]'::jsonb;

-- Consultant's milestone/payment term adjustments
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS milestone_adjustments JSONB DEFAULT '[]'::jsonb;

-- Consultant's notes responding to entrepreneur's request
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS consultant_request_notes TEXT;

-- Consultant's files uploaded in response to request
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS consultant_request_files JSONB DEFAULT '[]'::jsonb;

-- Consultant's notes on services scope
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS services_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.proposals.fee_line_items IS 'Structured fee breakdown with consultant prices, quantities, and comments';
COMMENT ON COLUMN public.proposals.selected_services IS 'Array of service scope item IDs selected by consultant';
COMMENT ON COLUMN public.proposals.milestone_adjustments IS 'Consultant adjustments to entrepreneur payment milestones';
COMMENT ON COLUMN public.proposals.consultant_request_notes IS 'Consultant response notes to entrepreneur request';
COMMENT ON COLUMN public.proposals.consultant_request_files IS 'Files uploaded by consultant in response to request';
COMMENT ON COLUMN public.proposals.services_notes IS 'Consultant notes about service scope';
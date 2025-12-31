-- Add 'draft' to rfp_invite_status enum
ALTER TYPE public.rfp_invite_status ADD VALUE IF NOT EXISTS 'draft';
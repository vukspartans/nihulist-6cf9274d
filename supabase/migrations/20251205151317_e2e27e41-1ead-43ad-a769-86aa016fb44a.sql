-- Fix the incorrectly updated declined invite
-- This invite was declined but got changed to 'submitted' due to the bug
UPDATE public.rfp_invites
SET status = 'declined'
WHERE id = '3f5c0d25-a0fb-46bd-87ec-a015232148a7'
  AND decline_reason IS NOT NULL;
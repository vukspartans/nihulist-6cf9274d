-- Extend deadline for Gordon 16 RFP by 48 hours (non-terminal invites only)
UPDATE rfp_invites
SET deadline_at = deadline_at + interval '48 hours'
WHERE rfp_id = '8a9650b3-36f0-43a7-9de8-427b5f62ed2f'
  AND status NOT IN ('submitted', 'declined', 'expired');
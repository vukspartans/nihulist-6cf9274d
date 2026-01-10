-- Fix incorrect invite status where status is 'submitted' but no proposal exists
UPDATE rfp_invites 
SET status = 'opened' 
WHERE id = 'f7f25a76-6cdc-46b7-9076-1e552874a497'
AND status = 'submitted';
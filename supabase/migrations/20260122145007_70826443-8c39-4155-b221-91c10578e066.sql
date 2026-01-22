-- 1. Cancel the duplicate negotiation session
UPDATE negotiation_sessions 
SET status = 'cancelled', 
    resolved_at = now(),
    updated_at = now()
WHERE id = '270e232f-cbec-47d0-87e7-74311fa578d6';

-- 2. Update proposal status to reflect the counter-offer state (without updated_at)
UPDATE proposals 
SET status = 'resubmitted',
    has_active_negotiation = false
WHERE id = 'ce3663bc-2791-4937-8a8a-d8bd8f1ef7ea';
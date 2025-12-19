
-- Reset organization_id on profile
UPDATE profiles 
SET organization_id = NULL 
WHERE email = 'lior@narshaltd.com';

-- Clear onboarding status on company
UPDATE companies 
SET onboarding_completed_at = NULL, onboarding_skipped_at = NULL 
WHERE id = 'c4553052-21df-44d0-a2ac-94d74587905c';

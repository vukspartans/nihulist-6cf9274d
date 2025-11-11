-- Phase 1: Database Cleanup - Remove conflicting role assignments
-- Remove entrepreneur role from users who have admin role
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
) AND role = 'entrepreneur';

-- Remove advisor role from users who have admin role
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
) AND role = 'advisor';

-- Comment: This ensures admin users only have the admin role, preventing privilege confusion
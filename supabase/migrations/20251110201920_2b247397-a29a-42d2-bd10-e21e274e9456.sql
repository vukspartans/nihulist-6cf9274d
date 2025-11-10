-- Create function to sync email from auth.users when profile is inserted without email
CREATE OR REPLACE FUNCTION public.sync_profile_email_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If email is NULL or empty, fetch from auth.users
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email 
    FROM auth.users 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync email on profile insert
CREATE TRIGGER before_profile_insert_sync_email
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email_on_insert();
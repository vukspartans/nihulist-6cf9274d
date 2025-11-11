-- Create trigger to insert user_roles based on signup metadata
CREATE OR REPLACE FUNCTION public.handle_metadata_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text;
BEGIN
  -- Get role from metadata
  meta_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Only insert if it's a valid role
  IF meta_role IN ('admin', 'advisor', 'entrepreneur', 'supplier') THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.id, meta_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for role assignment
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_metadata_role();

-- Verify handle_new_user trigger exists (it should already be there)
-- If not, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created' 
    AND event_object_schema = 'auth'
    AND event_object_table = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;
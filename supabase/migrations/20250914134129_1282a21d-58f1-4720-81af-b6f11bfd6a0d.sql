-- Fix the handle_new_user trigger to properly create profiles with metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with all metadata
  INSERT INTO public.profiles (
    user_id, 
    name, 
    phone, 
    company_name, 
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'company_name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'entrepreneur')
  );
  
  -- If user is an advisor, also create advisor record
  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'entrepreneur') = 'advisor' THEN
    INSERT INTO public.advisors (
      user_id,
      company_name,
      location
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'company_name',
      NEW.raw_user_meta_data ->> 'location'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create helper function to get user profile with role
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  phone text,
  company_name text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.name,
    p.phone,
    p.company_name,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = user_uuid;
$$;
-- Add ToS acceptance columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tos_version TEXT DEFAULT '1.0';

-- Update the handle_new_user trigger to store ToS acceptance
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    name, 
    phone, 
    company_name, 
    role, 
    email,
    tos_accepted_at,
    tos_version
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'name', 
    new.raw_user_meta_data ->> 'phone', 
    new.raw_user_meta_data ->> 'company_name',
    COALESCE(new.raw_user_meta_data ->> 'role', 'entrepreneur'),
    new.email,
    CASE 
      WHEN (new.raw_user_meta_data ->> 'tos_accepted')::boolean = true 
      THEN now() 
      ELSE NULL 
    END,
    new.raw_user_meta_data ->> 'tos_version'
  );
  RETURN new;
END;
$$;
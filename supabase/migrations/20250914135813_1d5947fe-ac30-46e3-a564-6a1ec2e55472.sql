-- Create missing trigger for user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('entrepreneur', 'advisor')),
  location TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create company_members table for user roles within companies
CREATE TABLE public.company_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS on company_members
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Update advisors table to reference companies
ALTER TABLE public.advisors 
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN specialties TEXT[] DEFAULT '{}',
  ADD COLUMN years_experience INTEGER,
  ADD COLUMN hourly_rate NUMERIC,
  ADD COLUMN availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable'));

-- Create RLS policies for companies
CREATE POLICY "Company members can view their company" 
ON public.companies 
FOR SELECT 
USING (id IN (
  SELECT company_id FROM public.company_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Company owners can update their company" 
ON public.companies 
FOR UPDATE 
USING (id IN (
  SELECT company_id FROM public.company_members 
  WHERE user_id = auth.uid() AND role = 'owner'
));

CREATE POLICY "Authenticated users can create companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for company_members
CREATE POLICY "Users can view their company memberships" 
ON public.company_members 
FOR SELECT 
USING (user_id = auth.uid() OR company_id IN (
  SELECT company_id FROM public.company_members 
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

CREATE POLICY "Company owners can manage members" 
ON public.company_members 
FOR ALL 
USING (company_id IN (
  SELECT company_id FROM public.company_members 
  WHERE user_id = auth.uid() AND role = 'owner'
));

CREATE POLICY "Users can insert themselves as company members" 
ON public.company_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Update handle_new_user function to create company for advisors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_uuid UUID;
  user_role TEXT;
BEGIN
  -- Get the user role from metadata
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'entrepreneur');
  
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
    user_role
  );
  
  -- If user has a company name, create a company
  IF NEW.raw_user_meta_data ->> 'company_name' IS NOT NULL AND 
     NEW.raw_user_meta_data ->> 'company_name' != '' THEN
    
    INSERT INTO public.companies (
      name,
      type,
      location
    )
    VALUES (
      NEW.raw_user_meta_data ->> 'company_name',
      user_role,
      NEW.raw_user_meta_data ->> 'location'
    )
    RETURNING id INTO company_uuid;
    
    -- Add user as company owner
    INSERT INTO public.company_members (
      company_id,
      user_id,
      role
    )
    VALUES (
      company_uuid,
      NEW.id,
      'owner'
    );
  END IF;
  
  -- If user is an advisor, also create advisor record
  IF user_role = 'advisor' THEN
    INSERT INTO public.advisors (
      user_id,
      company_name,
      location,
      company_id
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'company_name',
      NEW.raw_user_meta_data ->> 'location',
      company_uuid
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for updating timestamps
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_members_updated_at
BEFORE UPDATE ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Enhance profiles table to better support advisor roles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text;

-- Create advisors table for advisor-specific data
CREATE TABLE public.advisors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  expertise TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  location TEXT,
  rating NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on advisors table
ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for advisors
CREATE POLICY "Advisors can view their own profile" 
ON public.advisors 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Advisors can update their own profile" 
ON public.advisors 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Advisors can insert their own profile" 
ON public.advisors 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Entrepreneurs can view active advisors for recommendations" 
ON public.advisors 
FOR SELECT 
USING (is_active = true AND EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'entrepreneur'
));

-- Add advisor_id to proposals table to link proposals to advisor profiles
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS advisor_id UUID REFERENCES public.advisors(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_advisors_user_id ON public.advisors(user_id);
CREATE INDEX IF NOT EXISTS idx_advisors_expertise ON public.advisors USING GIN(expertise);
CREATE INDEX IF NOT EXISTS idx_proposals_advisor_id ON public.proposals(advisor_id);

-- Update proposals RLS to allow advisors to view proposals they submitted
DROP POLICY IF EXISTS "Advisors can view their own proposals" ON public.proposals;
CREATE POLICY "Advisors can view their own proposals" 
ON public.proposals 
FOR SELECT 
USING (advisor_id IN (
  SELECT id FROM public.advisors WHERE user_id = auth.uid()
));

-- Allow advisors to insert proposals
DROP POLICY IF EXISTS "Advisors can create proposals" ON public.proposals;
CREATE POLICY "Advisors can create proposals" 
ON public.proposals 
FOR INSERT 
WITH CHECK (advisor_id IN (
  SELECT id FROM public.advisors WHERE user_id = auth.uid()
));

-- Create trigger for updated_at column
CREATE TRIGGER update_advisors_updated_at
BEFORE UPDATE ON public.advisors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update RFP invites to support advisor invitations
ALTER TABLE public.rfp_invites ADD COLUMN IF NOT EXISTS advisor_id UUID REFERENCES public.advisors(id);

-- Allow advisors to view RFP invites sent to them
DROP POLICY IF EXISTS "Advisors can view their RFP invites" ON public.rfp_invites;
CREATE POLICY "Advisors can view their RFP invites" 
ON public.rfp_invites 
FOR SELECT 
USING (advisor_id IN (
  SELECT id FROM public.advisors WHERE user_id = auth.uid()
));
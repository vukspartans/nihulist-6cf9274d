-- Add admin_approved column to profiles table for entrepreneur approval workflow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_approved boolean NOT NULL DEFAULT false;

-- Add approved_at and approved_by columns for audit trail
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Update existing entrepreneurs to be approved by default (grandfather existing users)
UPDATE public.profiles 
SET admin_approved = true 
WHERE role = 'entrepreneur' AND admin_approved = false;
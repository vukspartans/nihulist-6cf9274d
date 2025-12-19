-- Fix RLS policies for companies table to allow entrepreneurs to create organizations

-- Drop the existing INSERT policy that may be too restrictive
DROP POLICY IF EXISTS "Entrepreneurs can insert their organization" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;

-- Create a simpler INSERT policy that allows authenticated users to create companies
CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
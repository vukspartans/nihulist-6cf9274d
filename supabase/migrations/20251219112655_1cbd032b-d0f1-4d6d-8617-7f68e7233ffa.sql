-- Grant privileges to authenticated role for companies table
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;

-- Recreate INSERT policy with proper role targeting
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON companies;

CREATE POLICY "Allow authenticated users to create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;

-- Create a simpler INSERT policy with WITH CHECK (true)
-- The TO authenticated clause already ensures only authenticated users can insert
CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);
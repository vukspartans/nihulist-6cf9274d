-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;

-- Create policy using standard Supabase pattern (no role restriction, uses auth.uid())
CREATE POLICY "Allow authenticated users to create companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Fix Storage RLS for negotiation-files bucket using SECURITY DEFINER access check
-- This avoids RLS subquery failures when storage policies reference public tables.

-- 1) Drop legacy policies (names may differ; dropping is safe)
DROP POLICY IF EXISTS "Entrepreneurs can upload negotiation files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload negotiation files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view negotiation files" ON storage.objects;
DROP POLICY IF EXISTS "Entrepreneurs can delete negotiation files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete negotiation files" ON storage.objects;
DROP POLICY IF EXISTS "Admins have full access to negotiation files" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access negotiation files" ON storage.objects;

-- 2) Create INSERT policy
CREATE POLICY "Users can upload negotiation files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'negotiation-files'
  AND public.can_access_proposal_file(name, auth.uid())
);

-- 3) Create SELECT policy
CREATE POLICY "Users can view negotiation files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'negotiation-files'
  AND public.can_access_proposal_file(name, auth.uid())
);

-- 4) Create DELETE policy
CREATE POLICY "Users can delete negotiation files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'negotiation-files'
  AND public.can_access_proposal_file(name, auth.uid())
);

-- 5) Admin policy (optional but helpful)
CREATE POLICY "Admins have full access to negotiation files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'negotiation-files'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'negotiation-files'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

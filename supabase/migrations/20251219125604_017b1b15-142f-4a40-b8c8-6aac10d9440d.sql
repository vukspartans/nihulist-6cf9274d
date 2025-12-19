-- Clear organization_id from profile for testing
UPDATE profiles 
SET organization_id = NULL 
WHERE user_id = '975deb79-83ff-4a85-9a00-b4b122af0bdf';

-- Delete entrepreneur companies associated with this user
DELETE FROM companies 
WHERE type = 'entrepreneur' 
AND id IN (
  SELECT organization_id FROM profiles WHERE user_id = '975deb79-83ff-4a85-9a00-b4b122af0bdf'
);

-- Also delete any orphaned entrepreneur companies created by this user
DELETE FROM company_members 
WHERE user_id = '975deb79-83ff-4a85-9a00-b4b122af0bdf';
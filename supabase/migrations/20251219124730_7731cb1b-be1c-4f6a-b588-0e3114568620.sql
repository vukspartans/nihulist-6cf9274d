-- Clear organization_id from profile
UPDATE profiles 
SET organization_id = NULL 
WHERE user_id = '975deb79-83ff-4a85-9a00-b4b122af0bdf';

-- Delete test entrepreneur companies
DELETE FROM companies 
WHERE id IN (
  '084cb61f-23b2-4655-9ecb-0ebca94cd2b0',
  'c4553052-21df-44d0-a2ac-94d74587905c'
);
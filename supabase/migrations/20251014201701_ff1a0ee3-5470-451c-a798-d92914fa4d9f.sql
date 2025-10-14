-- Update default phase value for projects table to use new phase system
ALTER TABLE projects 
ALTER COLUMN phase SET DEFAULT 'בדיקה ראשונית';
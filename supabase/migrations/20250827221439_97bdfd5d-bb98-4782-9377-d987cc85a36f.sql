-- Add custom name and description fields to project_files table
ALTER TABLE public.project_files 
ADD COLUMN custom_name TEXT,
ADD COLUMN description TEXT;
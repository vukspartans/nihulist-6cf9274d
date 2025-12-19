-- Drop the old constraint
ALTER TABLE public.activity_log 
DROP CONSTRAINT IF EXISTS activity_log_actor_type_check;

-- Add new constraint with 'advisor' included
ALTER TABLE public.activity_log 
ADD CONSTRAINT activity_log_actor_type_check 
CHECK (actor_type = ANY (ARRAY['system'::text, 'entrepreneur'::text, 'supplier'::text, 'admin'::text, 'advisor'::text]));
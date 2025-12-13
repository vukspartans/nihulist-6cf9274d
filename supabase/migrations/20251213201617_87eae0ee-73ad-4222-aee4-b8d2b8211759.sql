-- Create user_feedback table for collecting user feedback
CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message text,
  email text,
  user_id uuid,
  page_url text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit feedback (even anonymous)
CREATE POLICY "Anyone can submit feedback" ON public.user_feedback
  FOR INSERT WITH CHECK (true);

-- Only admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON public.user_feedback
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback" ON public.user_feedback
  FOR DELETE USING (has_role(auth.uid(), 'admin'));
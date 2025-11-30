-- Create advisor_team_members table
CREATE TABLE public.advisor_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES public.advisors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  notification_preferences TEXT[] NOT NULL DEFAULT ARRAY['all']::text[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique constraint on advisor_id + email
CREATE UNIQUE INDEX idx_advisor_team_member_email ON public.advisor_team_members(advisor_id, email);

-- Add trigger for updated_at
CREATE TRIGGER update_advisor_team_members_updated_at
  BEFORE UPDATE ON public.advisor_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.advisor_team_members ENABLE ROW LEVEL SECURITY;

-- RLS policy: Advisors can manage their team members
CREATE POLICY "Advisors can manage their team members"
  ON public.advisor_team_members
  FOR ALL
  USING (
    advisor_id IN (
      SELECT id FROM public.advisors WHERE user_id = auth.uid()
    )
  );
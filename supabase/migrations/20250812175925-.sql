-- Create users table
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('entrepreneur', 'admin')),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    type TEXT,
    location TEXT,
    budget NUMERIC,
    timeline_start DATE NOT NULL,
    timeline_end DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rfp_sent', 'collecting', 'comparing', 'selected', 'closed', 'deleted')),
    awaiting_banner_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_files table
CREATE TABLE public.project_files (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_mb NUMERIC NOT NULL CHECK (size_mb <= 10),
    ai_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    location TEXT,
    expertise TEXT[] DEFAULT '{}',
    rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
    certifications TEXT[] DEFAULT '{}',
    past_projects TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recommendations table
CREATE TABLE public.recommendations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    match_score NUMERIC NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended', 'removed', 'not_relevant', 'sent_rfp')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rfps table
CREATE TABLE public.rfps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    sent_by UUID NOT NULL REFERENCES auth.users(id),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rfp_invites table
CREATE TABLE public.rfp_invites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rfp_id UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id),
    submit_token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'bounced', 'delivered', 'opened', 'submitted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposals table
CREATE TABLE public.proposals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id),
    price NUMERIC NOT NULL,
    timeline_days INTEGER NOT NULL,
    terms TEXT,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'under_review', 'selected', 'not_relevant')),
    ai_flags JSONB DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_log table
CREATE TABLE public.activity_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id),
    actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'entrepreneur', 'supplier', 'admin')),
    actor_id UUID,
    action TEXT NOT NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for projects  
CREATE POLICY "Entrepreneurs can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Entrepreneurs can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Entrepreneurs can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Entrepreneurs can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = owner_id);

-- Create RLS policies for project_files
CREATE POLICY "Users can view files of their projects" ON public.project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_files.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create files for their projects" ON public.project_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_files.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- Create RLS policies for suppliers (admin access)
CREATE POLICY "Suppliers are viewable by authenticated users" ON public.suppliers
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify suppliers" ON public.suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create RLS policies for recommendations
CREATE POLICY "Users can view recommendations for their projects" ON public.recommendations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = recommendations.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- Create RLS policies for rfps
CREATE POLICY "Users can view RFPs for their projects" ON public.rfps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = rfps.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- Create RLS policies for rfp_invites
CREATE POLICY "Users can view RFP invites for their projects" ON public.rfp_invites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rfps 
            JOIN public.projects ON projects.id = rfps.project_id
            WHERE rfps.id = rfp_invites.rfp_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- Create RLS policies for proposals
CREATE POLICY "Users can view proposals for their projects" ON public.proposals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = proposals.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can create proposals with valid token" ON public.proposals
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for activity_log
CREATE POLICY "Users can view activity for their projects" ON public.activity_log
    FOR SELECT USING (
        project_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = activity_log.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample suppliers
INSERT INTO public.suppliers (name, email, phone, location, expertise, rating, certifications, past_projects) VALUES
('חברת בניה מתקדמת', 'info@advanced-build.co.il', '03-1234567', 'תל אביב', ARRAY['בניה', 'עבודות גמר', 'ניהול פרויקטים'], 4.5, ARRAY['ISO 9001', 'תקן ישראלי 1142'], ARRAY['מתחם משרדים רמת גן', 'פרויקט מגורים בת ים']),
('אלקטרון הדסה', 'contact@electron-eng.co.il', '04-9876543', 'חיפה', ARRAY['חשמל', 'אוטומציה', 'מערכות חכמות'], 4.2, ARRAY['רישיון חשמלאי מוסמך', 'ISO 14001'], ARRAY['מפעל היטק חיפה', 'בית חכם נתניה']),
('אבן דרך פיתוח', 'sales@milestone-dev.co.il', '08-5555555', 'באר שבע', ARRAY['תשתיות', 'כבישים', 'ניקוז'], 3.8, ARRAY['רישיון קבלן בנייה', 'תקן בטיחות 18001'], ARRAY['כביש חוצה ישראל', 'פארק תעשייה דימונה']),
('קליק מערכות אוויר', 'info@click-hvac.co.il', '02-7777777', 'ירושלים', ARRAY['מיזוג אוויר', 'אוורור', 'קירור'], 4.7, ARRAY['רישיון מיזוג אוויר', 'תו תקן ירוק'], ARRAY['בית חולים הדסה', 'מרכז קניות מלחה']),
('פלדה בניין', 'office@steel-build.co.il', '09-3333333', 'כפר סבא', ARRAY['מבני פלדה', 'ריתוך', 'הרכבה'], 4.0, ARRAY['רישיון ריתוך מוסמך', 'EN 1090'], ARRAY['מפעל תעשייה פתח תקווה', 'אולם ספורט רעננה']);
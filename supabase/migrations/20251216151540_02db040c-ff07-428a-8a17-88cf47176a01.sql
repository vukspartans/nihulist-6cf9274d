-- =============================================
-- NEGOTIATION MODULE DATABASE SCHEMA
-- =============================================

-- 1. Add new proposal status values
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'negotiation_requested' AFTER 'under_review';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'resubmitted' AFTER 'negotiation_requested';

-- 2. Create negotiation_status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'negotiation_status') THEN
        CREATE TYPE negotiation_status AS ENUM ('open', 'awaiting_response', 'responded', 'resolved', 'cancelled');
    END IF;
END$$;

-- 3. Create proposal_versions table - stores snapshots of proposal history
CREATE TABLE IF NOT EXISTS public.proposal_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL,
    timeline_days INTEGER NOT NULL,
    scope_text TEXT,
    terms TEXT,
    conditions_json JSONB DEFAULT '{}'::jsonb,
    line_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    UNIQUE(proposal_id, version_number)
);

-- 4. Create proposal_line_items table - breakdown of proposal into negotiable items
CREATE TABLE IF NOT EXISTS public.proposal_line_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    is_optional BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create negotiation_sessions table - tracks negotiation threads
CREATE TABLE IF NOT EXISTS public.negotiation_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    initiator_id UUID NOT NULL REFERENCES auth.users(id),
    consultant_advisor_id UUID NOT NULL REFERENCES public.advisors(id),
    status negotiation_status NOT NULL DEFAULT 'open',
    target_total NUMERIC,
    target_reduction_percent NUMERIC,
    global_comment TEXT,
    initiator_message TEXT,
    consultant_response_message TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create negotiation_comments table - comments on specific aspects
CREATE TABLE IF NOT EXISTS public.negotiation_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.negotiation_sessions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    author_type TEXT NOT NULL CHECK (author_type IN ('initiator', 'consultant')),
    comment_type TEXT NOT NULL CHECK (comment_type IN ('document', 'scope', 'milestone', 'payment', 'general', 'line_item')),
    entity_reference TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create line_item_negotiations table - price adjustments per line item
CREATE TABLE IF NOT EXISTS public.line_item_negotiations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.negotiation_sessions(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES public.proposal_line_items(id) ON DELETE CASCADE,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('price_change', 'flat_discount', 'percentage_discount')),
    original_price NUMERIC NOT NULL,
    adjustment_value NUMERIC NOT NULL,
    initiator_target_price NUMERIC NOT NULL,
    consultant_response_price NUMERIC,
    final_price NUMERIC,
    initiator_note TEXT,
    consultant_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Add version tracking columns to proposals table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'current_version') THEN
        ALTER TABLE public.proposals ADD COLUMN current_version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'has_active_negotiation') THEN
        ALTER TABLE public.proposals ADD COLUMN has_active_negotiation BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'negotiation_count') THEN
        ALTER TABLE public.proposals ADD COLUMN negotiation_count INTEGER DEFAULT 0;
    END IF;
END$$;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_item_negotiations ENABLE ROW LEVEL SECURITY;

-- proposal_versions policies
CREATE POLICY "Admins can manage all proposal versions"
    ON public.proposal_versions FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Entrepreneurs can view versions for their project proposals"
    ON public.proposal_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.proposals p
            JOIN public.projects proj ON proj.id = p.project_id
            WHERE p.id = proposal_versions.proposal_id
            AND proj.owner_id = auth.uid()
        )
    );

CREATE POLICY "Advisors can view and create versions for their proposals"
    ON public.proposal_versions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.proposals p
            JOIN public.advisors a ON a.id = p.advisor_id
            WHERE p.id = proposal_versions.proposal_id
            AND a.user_id = auth.uid()
        )
    );

-- proposal_line_items policies
CREATE POLICY "Admins can manage all line items"
    ON public.proposal_line_items FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Entrepreneurs can view line items for their project proposals"
    ON public.proposal_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.proposals p
            JOIN public.projects proj ON proj.id = p.project_id
            WHERE p.id = proposal_line_items.proposal_id
            AND proj.owner_id = auth.uid()
        )
    );

CREATE POLICY "Advisors can manage line items for their proposals"
    ON public.proposal_line_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.proposals p
            JOIN public.advisors a ON a.id = p.advisor_id
            WHERE p.id = proposal_line_items.proposal_id
            AND a.user_id = auth.uid()
        )
    );

-- negotiation_sessions policies
CREATE POLICY "Admins can manage all negotiation sessions"
    ON public.negotiation_sessions FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Initiators can view and create their negotiation sessions"
    ON public.negotiation_sessions FOR ALL
    USING (initiator_id = auth.uid());

CREATE POLICY "Consultants can view and respond to their negotiation sessions"
    ON public.negotiation_sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.advisors a
            WHERE a.id = negotiation_sessions.consultant_advisor_id
            AND a.user_id = auth.uid()
        )
    );

-- negotiation_comments policies
CREATE POLICY "Admins can manage all comments"
    ON public.negotiation_comments FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Session participants can view comments"
    ON public.negotiation_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiation_sessions ns
            WHERE ns.id = negotiation_comments.session_id
            AND (
                ns.initiator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.advisors a
                    WHERE a.id = ns.consultant_advisor_id
                    AND a.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can create their own comments"
    ON public.negotiation_comments FOR INSERT
    WITH CHECK (author_id = auth.uid());

-- line_item_negotiations policies
CREATE POLICY "Admins can manage all line item negotiations"
    ON public.line_item_negotiations FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Session participants can view line item negotiations"
    ON public.line_item_negotiations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiation_sessions ns
            WHERE ns.id = line_item_negotiations.session_id
            AND (
                ns.initiator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.advisors a
                    WHERE a.id = ns.consultant_advisor_id
                    AND a.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Initiators can create line item negotiations"
    ON public.line_item_negotiations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.negotiation_sessions ns
            WHERE ns.id = line_item_negotiations.session_id
            AND ns.initiator_id = auth.uid()
        )
    );

CREATE POLICY "Session participants can update line item negotiations"
    ON public.line_item_negotiations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiation_sessions ns
            WHERE ns.id = line_item_negotiations.session_id
            AND (
                ns.initiator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.advisors a
                    WHERE a.id = ns.consultant_advisor_id
                    AND a.user_id = auth.uid()
                )
            )
        )
    );

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_id ON public.proposal_versions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_line_items_proposal_id ON public.proposal_line_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_proposal_id ON public.negotiation_sessions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_project_id ON public.negotiation_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_initiator_id ON public.negotiation_sessions(initiator_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_consultant_id ON public.negotiation_sessions(consultant_advisor_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_status ON public.negotiation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_negotiation_comments_session_id ON public.negotiation_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_line_item_negotiations_session_id ON public.line_item_negotiations(session_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_proposal_line_items_updated_at
    BEFORE UPDATE ON public.proposal_line_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_negotiation_sessions_updated_at
    BEFORE UPDATE ON public.negotiation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_line_item_negotiations_updated_at
    BEFORE UPDATE ON public.line_item_negotiations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
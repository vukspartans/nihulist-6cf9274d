import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { ProposalRejectedEmail } from '../_shared/email-templates/proposal-rejected.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposal_id, rejection_reason, test_mode = false } = await req.json();
    console.log('[Proposal Rejected] Processing notification for proposal:', proposal_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch proposal with all related data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        id,
        project_id,
        advisor_id,
        terms,
        projects (
          id,
          name,
          owner_id
        ),
        advisors (
          id,
          company_name,
          user_id,
          profiles!advisors_user_id_fkey (
            email,
            name
          )
        )
      `)
      .eq('id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      console.error('[Proposal Rejected] Proposal not found:', proposalError);
      throw new Error('Proposal not found');
    }

    console.log('[Proposal Rejected] Proposal data:', proposal);

    const project = proposal.projects as any;
    const advisor = proposal.advisors as any;
    const advisorProfile = advisor.profiles as any;

    if (!advisorProfile?.email) {
      console.error('[Proposal Rejected] Advisor email not found');
      throw new Error('Advisor email not found');
    }

    // Determine recipient email
    const recipientEmail = test_mode 
      ? 'lior+nihulist@spartans.tech' 
      : advisorProfile.email;

    console.log('[Proposal Rejected] Sending to:', recipientEmail, '(test_mode:', test_mode, ')');

    // Extract rejection reason from terms or use provided reason
    let finalRejectionReason = rejection_reason;
    if (!finalRejectionReason && proposal.terms && proposal.terms.includes('סיבת דחייה:')) {
      finalRejectionReason = proposal.terms.replace('סיבת דחייה:', '').trim();
    }

    // Dashboard URL for advisor
    const dashboardUrl = `https://www.nihulist.co.il/advisor-dashboard`;

    // Render email
    const html = await renderAsync(
      React.createElement(ProposalRejectedEmail, {
        advisorCompany: advisor.company_name || 'יועץ',
        projectName: project.name,
        rejectionReason: finalRejectionReason,
        dashboardUrl,
      })
    );

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'ניהוליסט <notifications@nihulist.co.il>',
      to: [recipientEmail],
      subject: `עדכון לגבי הצעתך - ${project.name}`,
      html,
    });

    if (emailError) {
      console.error('[Proposal Rejected] Resend error:', emailError);
      throw emailError;
    }

    console.log('[Proposal Rejected] Email sent successfully:', emailData);

    // Log activity
    await supabase.from('activity_log').insert({
      actor_id: project.owner_id,
      actor_type: 'system',
      action: 'proposal_rejected_email_sent',
      entity_type: 'proposal',
      entity_id: proposal_id,
      project_id: project.id,
      meta: {
        recipient: recipientEmail,
        test_mode,
        email_id: emailData?.id,
        rejection_reason: finalRejectionReason,
      },
    });

    // Update proposal with notification timestamp
    await supabase
      .from('proposals')
      .update({ advisor_notified_at: new Date().toISOString() })
      .eq('id', proposal_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailData?.id,
        test_mode,
        recipient: recipientEmail,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[Proposal Rejected] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.31';
import React from 'npm:react@18.3.1';
import { ProposalSubmittedEmail } from '../_shared/email-templates/proposal-submitted.tsx';

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
    const { proposal_id, test_mode = false } = await req.json();
    console.log('[Proposal Submitted] Processing notification for proposal:', proposal_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch proposal with all related data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        id,
        price,
        timeline_days,
        files,
        project_id,
        advisor_id,
        rfp_invite_id
      `)
      .eq('id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      console.error('[Proposal Submitted] Proposal not found:', proposalError);
      throw new Error('Proposal not found');
    }

    // Fetch project with owner profile
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        owner_id
      `)
      .eq('id', proposal.project_id)
      .single();

    if (projectError || !project) {
      console.error('[Proposal Submitted] Project not found:', projectError);
      throw new Error('Project not found');
    }

    // Fetch owner profile
    const { data: entrepreneurProfile, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', project.owner_id)
      .single();

    if (profileError || !entrepreneurProfile) {
      console.error('[Proposal Submitted] Entrepreneur profile not found:', profileError);
      throw new Error('Entrepreneur profile not found');
    }

    // Fetch advisor
    const { data: advisor, error: advisorError } = await supabase
      .from('advisors')
      .select('id, company_name, user_id')
      .eq('id', proposal.advisor_id)
      .single();

    if (advisorError || !advisor) {
      console.error('[Proposal Submitted] Advisor not found:', advisorError);
      throw new Error('Advisor not found');
    }

    // Fetch RFP invite for advisor_type
    let advisorType = 'יועץ';
    if (proposal.rfp_invite_id) {
      const { data: rfpInvite } = await supabase
        .from('rfp_invites')
        .select('advisor_type')
        .eq('id', proposal.rfp_invite_id)
        .single();
      if (rfpInvite?.advisor_type) {
        advisorType = rfpInvite.advisor_type;
      }
    }

    if (proposalError || !proposal) {
      console.error('[Proposal Submitted] Proposal not found:', proposalError);
      throw new Error('Proposal not found');
    }

    console.log('[Proposal Submitted] Proposal data:', { proposal, project, advisor });

    if (!entrepreneurProfile?.email) {
      console.error('[Proposal Submitted] Entrepreneur email not found');
      throw new Error('Entrepreneur email not found');
    }

    // Determine recipient email
    const recipientEmail = test_mode 
      ? 'lior+billding@spartans.tech' 
      : entrepreneurProfile.email;

    console.log('[Proposal Submitted] Sending to:', recipientEmail, '(test_mode:', test_mode, ')');

    // Count files
    const filesCount = Array.isArray(proposal.files) ? proposal.files.length : 0;

    // Project URL
    const projectUrl = `https://billding.ai/project/${project.id}`;

    // Render email
    const html = await renderAsync(
      React.createElement(ProposalSubmittedEmail, {
        entrepreneurName: entrepreneurProfile.name || 'יזם',
        projectName: project.name,
        advisorCompany: advisor.company_name || 'יועץ',
        advisorType: advisorType,
        price: proposal.price,
        filesCount,
        projectUrl,
      })
    );

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Billding <notifications@billding.ai>',
      to: [recipientEmail],
      subject: `הצעה חדשה התקבלה לפרויקט ${project.name}`,
      html,
    });

    if (emailError) {
      console.error('[Proposal Submitted] Resend error:', emailError);
      throw emailError;
    }

    console.log('[Proposal Submitted] Email sent successfully:', emailData);

    // Log activity
    await supabase.from('activity_log').insert({
      actor_id: advisor.user_id,
      actor_type: 'system',
      action: 'proposal_submitted_email_sent',
      entity_type: 'proposal',
      entity_id: proposal_id,
      project_id: project.id,
      meta: {
        recipient: recipientEmail,
        test_mode,
        email_id: emailData?.id,
      },
    });

    // Update proposal with notification timestamp
    await supabase
      .from('proposals')
      .update({ entrepreneur_notified_at: new Date().toISOString() })
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
    console.error('[Proposal Submitted] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { ProposalApprovedEmail } from '../_shared/email-templates/proposal-approved.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get team member emails
async function getTeamMemberEmails(
  supabase: any, 
  advisorId: string, 
  notificationType: 'rfp_requests' | 'updates'
): Promise<string[]> {
  const { data: teamMembers, error } = await supabase
    .from('advisor_team_members')
    .select('email, notification_preferences')
    .eq('advisor_id', advisorId)
    .eq('is_active', true);

  if (error || !teamMembers) {
    console.log(`[getTeamMemberEmails] No team members found or error:`, error);
    return [];
  }

  // Filter by notification preferences
  return teamMembers
    .filter((member: any) => 
      member.notification_preferences.includes('all') || 
      member.notification_preferences.includes(notificationType)
    )
    .map((member: any) => member.email);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposal_id, entrepreneur_notes, test_mode = false } = await req.json();
    console.log('[Proposal Approved] Processing notification for proposal:', proposal_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch proposal with related data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        id,
        price,
        timeline_days,
        project_id,
        advisor_id
      `)
      .eq('id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      console.error('[Proposal Approved] Proposal not found:', proposalError);
      throw new Error('Proposal not found');
    }

    // Fetch project and entrepreneur separately for more reliable queries
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', proposal.project_id)
      .single();

    if (projectError || !project) {
      console.error('[Proposal Approved] Project not found:', projectError);
      throw new Error('Project not found');
    }

    // Fetch entrepreneur profile
    const { data: entrepreneurProfile, error: entrepreneurError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', project.owner_id)
      .single();

    if (entrepreneurError) {
      console.warn('[Proposal Approved] Entrepreneur profile not found:', entrepreneurError);
    }

    // Fetch advisor and their profile
    const { data: advisor, error: advisorError } = await supabase
      .from('advisors')
      .select('id, company_name, user_id')
      .eq('id', proposal.advisor_id)
      .single();

    if (advisorError || !advisor) {
      console.error('[Proposal Approved] Advisor not found:', advisorError);
      throw new Error('Advisor not found');
    }

    const { data: advisorProfile, error: advisorProfileError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('user_id', advisor.user_id)
      .single();

    if (advisorProfileError || !advisorProfile?.email) {
      console.error('[Proposal Approved] Advisor profile/email not found:', advisorProfileError);
      throw new Error('Advisor email not found');
    }

    console.log('[Proposal Approved] Data loaded - Proposal:', proposal.id, 'Project:', project.name, 'Advisor:', advisor.company_name);

    // Get team member emails
    const teamEmails = await getTeamMemberEmails(supabase, proposal.advisor_id, 'updates');
    
    // Determine recipient emails
    const mainRecipient = test_mode 
      ? 'lior+billding@spartans.tech' 
      : advisorProfile.email;
    
    const allRecipients = test_mode 
      ? [mainRecipient]
      : [mainRecipient, ...teamEmails];

    console.log('[Proposal Approved] Sending to:', allRecipients.length, 'recipient(s)', '(test_mode:', test_mode, ')');

    // Project URL for advisor
    const projectUrl = `https://billding.ai/advisor-dashboard`;

    // Render email
    const html = await renderAsync(
      React.createElement(ProposalApprovedEmail, {
        advisorCompany: advisor.company_name || 'יועץ',
        projectName: project.name,
        entrepreneurName: entrepreneurProfile?.name || 'היזם',
        price: proposal.price,
        timelineDays: proposal.timeline_days,
        entrepreneurNotes: entrepreneur_notes || '',
        projectUrl,
      })
    );

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Billding <notifications@billding.ai>',
      to: allRecipients,
      subject: `🎉 הצעתך אושרה! - ${project.name}`,
      html,
    });

    if (emailError) {
      console.error('[Proposal Approved] Resend error:', emailError);
      throw emailError;
    }

    console.log('[Proposal Approved] Email sent successfully:', emailData);

    // Log activity
    await supabase.from('activity_log').insert({
      actor_id: project.owner_id,
      actor_type: 'system',
      action: 'proposal_approved_email_sent',
      entity_type: 'proposal',
      entity_id: proposal_id,
      project_id: project.id,
      meta: {
        recipients: allRecipients,
        test_mode,
        email_id: emailData?.id,
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
        recipients: allRecipients,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[Proposal Approved] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { RFPDeclinedEmail } from '../_shared/email-templates/rfp-declined.tsx';

const resendApiKey = Deno.env.get('RESEND_API_KEY');
if (!resendApiKey) {
  throw new Error('RESEND_API_KEY is not configured');
}
const resend = new Resend(resendApiKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invite_id, test_mode = false } = await req.json();
    console.log('[RFP Declined] Processing notification for invite:', invite_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invite with all related data
    const { data: invite, error: inviteError } = await supabase
      .from('rfp_invites')
      .select(`
        id,
        decline_reason,
        decline_note,
        advisor_type,
        rfp_id,
        advisors (
          id,
          company_name,
          user_id
        ),
        rfps!inner (
          id,
          project_id,
          projects (
            id,
            name,
            owner_id,
            profiles!projects_owner_id_fkey (
              name,
              email
            )
          )
        )
      `)
      .eq('id', invite_id)
      .single();

    if (inviteError || !invite) {
      console.error('[RFP Declined] Invite not found:', inviteError);
      throw new Error('Invite not found');
    }

    console.log('[RFP Declined] Invite data:', invite);

    const rfp = invite.rfps as any;
    const project = rfp.projects as any;
    const advisor = invite.advisors as any;
    const entrepreneurProfile = project.profiles as any;

    if (!entrepreneurProfile?.email) {
      console.error('[RFP Declined] Entrepreneur email not found');
      throw new Error('Entrepreneur email not found');
    }

    // Determine recipient email
    const recipientEmail = test_mode 
      ? 'lior+nihulist@spartans.tech' 
      : entrepreneurProfile.email;

    console.log('[RFP Declined] Sending to:', recipientEmail, '(test_mode:', test_mode, ')');

    // Project URL
    const projectUrl = `https://www.nihulist.co.il/project/${project.id}`;

    // Render email
    const html = await renderAsync(
      React.createElement(RFPDeclinedEmail, {
        entrepreneurName: entrepreneurProfile.name || 'יזם',
        projectName: project.name,
        advisorCompany: advisor.company_name || 'יועץ',
        advisorType: invite.advisor_type || 'יועץ',
        declineReason: invite.decline_reason,
        declineNote: invite.decline_note,
        projectUrl,
      })
    );

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'ניהוליסט <notifications@nihulist.co.il>',
      to: [recipientEmail],
      subject: `יועץ דחה הזמנה לפרויקט ${project.name}`,
      html,
    });

    if (emailError) {
      console.error('[RFP Declined] Resend error:', emailError);
      throw emailError;
    }

    console.log('[RFP Declined] Email sent successfully:', emailData);

    // Log activity
    await supabase.from('activity_log').insert({
      actor_id: advisor.user_id,
      actor_type: 'system',
      action: 'rfp_declined_email_sent',
      entity_type: 'rfp_invite',
      entity_id: invite_id,
      project_id: project.id,
      meta: {
        recipient: recipientEmail,
        test_mode,
        email_id: emailData?.id,
        decline_reason: invite.decline_reason,
      },
    });

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
    console.error('[RFP Declined] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

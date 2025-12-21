import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { RFPDeadlineReminderEmail } from '../_shared/email-templates/rfp-deadline-reminder.tsx';

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
    console.log('[Deadline Reminder] Starting deadline reminder job');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find invites with upcoming deadlines (24-48 hours)
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: invites, error: invitesError } = await supabase
      .from('rfp_invites')
      .select(`
        id,
        deadline_at,
        advisor_type,
        last_notification_at,
        rfp_id,
        advisors (
          id,
          company_name,
          user_id,
          profiles!advisors_user_id_fkey (
            email,
            name
          )
        ),
        rfps!inner (
          id,
          project_id,
          projects (
            id,
            name
          )
        )
      `)
      .in('status', ['sent', 'opened', 'in_progress'])
      .gte('deadline_at', twentyFourHoursFromNow.toISOString())
      .lte('deadline_at', fortyEightHoursFromNow.toISOString());

    if (invitesError) {
      console.error('[Deadline Reminder] Error fetching invites:', invitesError);
      throw invitesError;
    }

    console.log(`[Deadline Reminder] Found ${invites?.length || 0} invites with upcoming deadlines`);

    let emailsSent = 0;
    const errors: any[] = [];

    for (const invite of invites || []) {
      try {
        const advisor = invite.advisors as any;
        const rfp = invite.rfps as any;
        const project = rfp.projects as any;
        const advisorProfile = advisor.profiles as any;

        // Skip if already notified in the last 12 hours
        if (invite.last_notification_at) {
          const lastNotification = new Date(invite.last_notification_at);
          const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          if (lastNotification > twelveHoursAgo) {
            console.log(`[Deadline Reminder] Skipping invite ${invite.id} - already notified recently`);
            continue;
          }
        }

        if (!advisorProfile?.email) {
          console.warn(`[Deadline Reminder] No email for advisor ${advisor.id}`);
          continue;
        }

        // Calculate hours remaining
        const deadlineDate = new Date(invite.deadline_at);
        const hoursRemaining = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        // Get team member emails
        const teamEmails = await getTeamMemberEmails(supabase, advisor.id, 'rfp_requests');
        const allRecipients = [advisorProfile.email, ...teamEmails];

        // Submit URL - use advisor dashboard
        const submitUrl = `https://www.billding.ai/advisor-dashboard`;

        // Render email
        const html = await renderAsync(
          React.createElement(RFPDeadlineReminderEmail, {
            advisorCompany: advisor.company_name || 'יועץ',
            projectName: project.name,
            advisorType: invite.advisor_type || 'יועץ',
            deadlineDate: invite.deadline_at,
            hoursRemaining,
            submitUrl,
          })
        );

        console.log(`[Deadline Reminder] Sending to ${allRecipients.length} recipient(s):`, allRecipients);

        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Billding <notifications@billding.ai>',
          to: allRecipients,
          subject: `תזכורת: ${hoursRemaining} שעות נותרו להגשת הצעה - ${project.name}`,
          html,
        });

        if (emailError) {
          console.error(`[Deadline Reminder] Failed to send email for invite ${invite.id}:`, emailError);
          errors.push({ invite_id: invite.id, error: emailError });
          continue;
        }

        console.log(`[Deadline Reminder] Email sent for invite ${invite.id}:`, emailData);

        // Update last notification timestamp
        await supabase
          .from('rfp_invites')
          .update({ last_notification_at: now.toISOString() })
          .eq('id', invite.id);

        // Log activity
        await supabase.from('activity_log').insert({
          actor_id: advisor.user_id,
          actor_type: 'system',
          action: 'deadline_reminder_sent',
          entity_type: 'rfp_invite',
          entity_id: invite.id,
          project_id: project.id,
          meta: {
            recipient: advisorProfile.email,
            email_id: emailData?.id,
            hours_remaining: hoursRemaining,
            deadline_at: invite.deadline_at,
          },
        });

        emailsSent++;
      } catch (error: any) {
        console.error(`[Deadline Reminder] Error processing invite ${invite.id}:`, error);
        errors.push({ invite_id: invite.id, error: error.message });
      }
    }

    console.log(`[Deadline Reminder] Job complete: ${emailsSent} emails sent, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emails_sent: emailsSent,
        errors_count: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[Deadline Reminder] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
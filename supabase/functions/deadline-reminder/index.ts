import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.31';
import React from 'npm:react@18.3.1';
import { RFPDeadlineReminderEmail } from '../_shared/email-templates/rfp-deadline-reminder.tsx';
import { withCronSecurity } from '../_shared/cron-auth.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

  if (error || !teamMembers) return [];

  return teamMembers
    .filter((member: any) =>
      member.notification_preferences.includes('all') ||
      member.notification_preferences.includes(notificationType)
    )
    .map((member: any) => member.email);
}

serve(withCronSecurity('deadline-reminder', async (_req) => {
  console.log('[Deadline Reminder] Starting deadline reminder job');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: invites, error: invitesError } = await supabase
    .from('rfp_invites')
    .select(`
      id, deadline_at, advisor_type, last_notification_at, rfp_id,
      advisors ( id, company_name, user_id, profiles!advisors_user_id_fkey ( email, name ) ),
      rfps!inner ( id, project_id, projects ( id, name ) )
    `)
    .in('status', ['sent', 'opened', 'in_progress'])
    .gte('deadline_at', twentyFourHoursFromNow.toISOString())
    .lte('deadline_at', fortyEightHoursFromNow.toISOString());

  if (invitesError) throw invitesError;

  console.log(`[Deadline Reminder] Found ${invites?.length || 0} invites with upcoming deadlines`);

  let emailsSent = 0;
  const errors: any[] = [];

  for (const invite of invites || []) {
    try {
      const advisor = invite.advisors as any;
      const rfp = invite.rfps as any;
      const project = rfp.projects as any;
      const advisorProfile = advisor.profiles as any;

      if (invite.last_notification_at) {
        const lastNotification = new Date(invite.last_notification_at);
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        if (lastNotification > twelveHoursAgo) continue;
      }

      if (!advisorProfile?.email) continue;

      const deadlineDate = new Date(invite.deadline_at);
      const hoursRemaining = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      const teamEmails = await getTeamMemberEmails(supabase, advisor.id, 'rfp_requests');
      const allRecipients = [advisorProfile.email, ...teamEmails];
      const submitUrl = `https://billding.ai/advisor-dashboard`;

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

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Billding <notifications@billding.ai>',
        to: allRecipients,
        subject: `תזכורת: ${hoursRemaining} שעות נותרו להגשת הצעה - ${project.name}`,
        html,
      });

      if (emailError) {
        errors.push({ invite_id: invite.id, error: emailError });
        continue;
      }

      await supabase
        .from('rfp_invites')
        .update({ last_notification_at: now.toISOString() })
        .eq('id', invite.id);

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
    { headers: { 'Content-Type': 'application/json' } }
  );
}));

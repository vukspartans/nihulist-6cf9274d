import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { Resend } from 'npm:resend@4.0.0'
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.31'
import { RFPUnopenedReminderEmail } from '../_shared/email-templates/rfp-unopened-reminder.tsx'
import { RFPNoSubmissionReminderEmail } from '../_shared/email-templates/rfp-no-submission-reminder.tsx'
import { RFPFinalDeadlineReminderEmail } from '../_shared/email-templates/rfp-final-deadline-reminder.tsx'
import { withCronSecurity } from '../_shared/cron-auth.ts';

async function getTeamMemberEmails(
  supabase: any,
  advisorId: string,
  notificationType: 'rfp_requests' | 'updates'
): Promise<string[]> {
  const { data: teamMembers } = await supabase
    .from('advisor_team_members')
    .select('email')
    .eq('advisor_id', advisorId)
    .eq('is_active', true)
    .contains('notification_preferences', [notificationType])
  return teamMembers?.map((m: any) => m.email) || []
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
}

function hoursBetween(date1: Date, date2: Date): number {
  return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60))
}

interface ReminderResult {
  stage: number
  inviteId: string
  advisorEmail: string
  success: boolean
  error?: string
}

serve(withCronSecurity('rfp-reminder-scheduler', async (_req) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resend = new Resend(resendApiKey)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const results: ReminderResult[] = []

  console.log(`[RFP-Reminder] Starting scheduler run at ${now.toISOString()}`)

  // STAGE 1: Unopened reminders (3 days after sent)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  const { data: stage1Invites, error: stage1Error } = await supabase
    .from('rfp_invites')
    .select(`
      id, email, advisor_id, advisor_type, deadline_at, created_at, last_notification_at, reminder_stage,
      rfps!inner ( id, project_id, subject, projects!inner (id, name, location) ),
      advisors!inner (id, company_name, user_id)
    `)
    .eq('status', 'sent')
    .lte('created_at', threeDaysAgo.toISOString())
    .or(`reminder_stage.is.null,reminder_stage.lt.1`)
    .or(`last_notification_at.is.null,last_notification_at.lt.${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}`)

  if (stage1Error) {
    console.error('[RFP-Reminder] Stage 1 query error:', stage1Error)
  } else {
    console.log(`[RFP-Reminder] Stage 1: Found ${stage1Invites?.length || 0} unopened invites`)
    for (const invite of stage1Invites || []) {
      try {
        const project = invite.rfps?.projects
        const advisor = invite.advisors
        if (!project || !advisor) continue

        const daysRemaining = daysBetween(now, new Date(invite.deadline_at))
        if (daysRemaining <= 0) continue

        const html = await renderAsync(
          React.createElement(RFPUnopenedReminderEmail, {
            advisorCompany: advisor.company_name || 'יועץ יקר',
            projectName: project.name,
            projectLocation: project.location,
            advisorType: invite.advisor_type || 'יועץ',
            deadlineDate: invite.deadline_at,
            daysRemaining,
            loginUrl: 'https://www.billding.ai/auth?type=advisor&mode=login',
          })
        )

        const teamEmails = await getTeamMemberEmails(supabase, invite.advisor_id, 'rfp_requests')
        const allRecipients = [invite.email, ...teamEmails].filter(Boolean)

        const { error: emailError } = await resend.emails.send({
          from: 'Billding <notifications@billding.ai>',
          to: allRecipients,
          subject: `📬 יש לך בקשה חדשה להצעת מחיר - ${project.name}`,
          html,
        })

        if (emailError) {
          results.push({ stage: 1, inviteId: invite.id, advisorEmail: invite.email, success: false, error: emailError.message })
        } else {
          await supabase.from('rfp_invites').update({ last_notification_at: now.toISOString(), reminder_stage: 1 }).eq('id', invite.id)
          await supabase.from('activity_log').insert({ actor_type: 'system', action: 'rfp_reminder_sent', entity_type: 'rfp_invite', entity_id: invite.id, project_id: project.id, meta: { stage: 1, type: 'unopened_3_day' } })
          results.push({ stage: 1, inviteId: invite.id, advisorEmail: invite.email, success: true })
        }
      } catch (err) {
        results.push({ stage: 1, inviteId: invite.id, advisorEmail: invite.email, success: false, error: String(err) })
      }
    }
  }

  // STAGE 2: No submission reminders (7 days after sent)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { data: stage2Invites, error: stage2Error } = await supabase
    .from('rfp_invites')
    .select(`
      id, email, advisor_id, advisor_type, deadline_at, created_at, last_notification_at, reminder_stage,
      rfps!inner ( id, project_id, subject, projects!inner (id, name, location) ),
      advisors!inner (id, company_name, user_id)
    `)
    .in('status', ['sent', 'opened'])
    .lte('created_at', sevenDaysAgo.toISOString())
    .or(`reminder_stage.is.null,reminder_stage.lt.2`)
    .or(`last_notification_at.is.null,last_notification_at.lt.${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}`)

  if (stage2Error) {
    console.error('[RFP-Reminder] Stage 2 query error:', stage2Error)
  } else {
    console.log(`[RFP-Reminder] Stage 2: Found ${stage2Invites?.length || 0} no-submission invites`)
    for (const invite of stage2Invites || []) {
      try {
        const project = invite.rfps?.projects
        const advisor = invite.advisors
        if (!project || !advisor) continue

        const daysRemaining = daysBetween(now, new Date(invite.deadline_at))
        if (daysRemaining <= 2) continue

        const html = await renderAsync(
          React.createElement(RFPNoSubmissionReminderEmail, {
            advisorCompany: advisor.company_name || 'יועץ יקר',
            projectName: project.name,
            projectLocation: project.location,
            advisorType: invite.advisor_type || 'יועץ',
            deadlineDate: invite.deadline_at,
            daysRemaining,
            loginUrl: 'https://www.billding.ai/auth?type=advisor&mode=login',
          })
        )

        const teamEmails = await getTeamMemberEmails(supabase, invite.advisor_id, 'rfp_requests')
        const allRecipients = [invite.email, ...teamEmails].filter(Boolean)

        const { error: emailError } = await resend.emails.send({
          from: 'Billding <notifications@billding.ai>',
          to: allRecipients,
          subject: `⏰ אל תפספס: ${daysRemaining} ימים להגשת הצעה - ${project.name}`,
          html,
        })

        if (emailError) {
          results.push({ stage: 2, inviteId: invite.id, advisorEmail: invite.email, success: false, error: emailError.message })
        } else {
          await supabase.from('rfp_invites').update({ last_notification_at: now.toISOString(), reminder_stage: 2 }).eq('id', invite.id)
          await supabase.from('activity_log').insert({ actor_type: 'system', action: 'rfp_reminder_sent', entity_type: 'rfp_invite', entity_id: invite.id, project_id: project.id, meta: { stage: 2, type: 'no_submission_7_day' } })
          results.push({ stage: 2, inviteId: invite.id, advisorEmail: invite.email, success: true })
        }
      } catch (err) {
        results.push({ stage: 2, inviteId: invite.id, advisorEmail: invite.email, success: false, error: String(err) })
      }
    }
  }

  // STAGE 3: Final deadline reminders (24-48h before deadline)
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const { data: stage3Invites, error: stage3Error } = await supabase
    .from('rfp_invites')
    .select(`
      id, email, advisor_id, advisor_type, deadline_at, created_at, last_notification_at, reminder_stage,
      rfps!inner ( id, project_id, subject, projects!inner (id, name, location) ),
      advisors!inner (id, company_name, user_id)
    `)
    .in('status', ['sent', 'opened', 'in_progress'])
    .gte('deadline_at', in24Hours.toISOString())
    .lte('deadline_at', in48Hours.toISOString())
    .or(`reminder_stage.is.null,reminder_stage.lt.3`)
    .or(`last_notification_at.is.null,last_notification_at.lt.${new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()}`)

  if (stage3Error) {
    console.error('[RFP-Reminder] Stage 3 query error:', stage3Error)
  } else {
    console.log(`[RFP-Reminder] Stage 3: Found ${stage3Invites?.length || 0} final deadline invites`)
    for (const invite of stage3Invites || []) {
      try {
        const project = invite.rfps?.projects
        const advisor = invite.advisors
        if (!project || !advisor) continue

        const hoursRemaining = hoursBetween(now, new Date(invite.deadline_at))

        const html = await renderAsync(
          React.createElement(RFPFinalDeadlineReminderEmail, {
            advisorCompany: advisor.company_name || 'יועץ יקר',
            projectName: project.name,
            projectLocation: project.location,
            advisorType: invite.advisor_type || 'יועץ',
            deadlineDate: invite.deadline_at,
            hoursRemaining,
            loginUrl: 'https://www.billding.ai/auth?type=advisor&mode=login',
          })
        )

        const teamEmails = await getTeamMemberEmails(supabase, invite.advisor_id, 'rfp_requests')
        const allRecipients = [invite.email, ...teamEmails].filter(Boolean)

        const { error: emailError } = await resend.emails.send({
          from: 'Billding <notifications@billding.ai>',
          to: allRecipients,
          subject: `⚠️ תזכורת אחרונה: ${hoursRemaining} שעות להגשה - ${project.name}`,
          html,
        })

        if (emailError) {
          results.push({ stage: 3, inviteId: invite.id, advisorEmail: invite.email, success: false, error: emailError.message })
        } else {
          await supabase.from('rfp_invites').update({ last_notification_at: now.toISOString(), reminder_stage: 3 }).eq('id', invite.id)
          await supabase.from('activity_log').insert({ actor_type: 'system', action: 'rfp_reminder_sent', entity_type: 'rfp_invite', entity_id: invite.id, project_id: project.id, meta: { stage: 3, type: 'final_deadline_24_48h', hours_remaining: hoursRemaining } })
          results.push({ stage: 3, inviteId: invite.id, advisorEmail: invite.email, success: true })
        }
      } catch (err) {
        results.push({ stage: 3, inviteId: invite.id, advisorEmail: invite.email, success: false, error: String(err) })
      }
    }
  }

  const summary = {
    timestamp: now.toISOString(),
    stage1_sent: results.filter(r => r.stage === 1 && r.success).length,
    stage2_sent: results.filter(r => r.stage === 2 && r.success).length,
    stage3_sent: results.filter(r => r.stage === 3 && r.success).length,
    total_sent: results.filter(r => r.success).length,
    total_failed: results.filter(r => !r.success).length,
    details: results,
  }

  console.log(`[RFP-Reminder] Completed. Summary:`, JSON.stringify(summary, null, 2))

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}));

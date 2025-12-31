import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.31'
import React from 'npm:react@18.3.1'
import { RFPInvitationEmail } from '../_shared/email-templates/rfp-invitation.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

interface RFPInvite {
  id: string
  rfp_id: string
  advisor_id: string
  advisor_type: string
  email: string
  deadline_at: string
  request_title: string | null
  request_content: string | null
  request_files: Array<{ name: string; url: string; size: number; path: string }> | null
}

interface Project {
  name: string
  type: string
  location: string
}

interface Advisor {
  company_name: string
  user_id: string
}

interface Profile {
  name: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { rfp_id, test_mode = false } = await req.json()

    if (!rfp_id) {
      throw new Error('rfp_id is required')
    }

    console.log('[send-rfp-email] Processing RFP:', rfp_id, 'Test mode:', test_mode)

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get RFP details
    const { data: rfp, error: rfpError } = await supabase
      .from('rfps')
      .select(`
        id,
        project_id,
        projects (
          name,
          type,
          location
        )
      `)
      .eq('id', rfp_id)
      .single()

    if (rfpError || !rfp) {
      console.error('[send-rfp-email] RFP not found:', rfpError)
      throw new Error('RFP not found')
    }

    const project = rfp.projects as unknown as Project

    // Get all invites for this RFP
    const { data: invites, error: invitesError } = await supabase
      .from('rfp_invites')
      .select(`
        id,
        rfp_id,
        advisor_id,
        advisor_type,
        email,
        deadline_at,
        request_title,
        request_content,
        request_files
      `)
      .eq('rfp_id', rfp_id)
      .eq('status', 'sent')

    if (invitesError) {
      console.error('[send-rfp-email] Error fetching invites:', invitesError)
      throw invitesError
    }

    if (!invites || invites.length === 0) {
      console.log('[send-rfp-email] No invites found for RFP:', rfp_id)
      return new Response(
        JSON.stringify({ success: true, message: 'No invites to send', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[send-rfp-email] Found ${invites.length} invites to send`)

    const emailResults = []

    // Send email to each invited advisor
    for (const invite of invites as RFPInvite[]) {
      try {
        // Get advisor details
        const { data: advisor, error: advisorError } = await supabase
          .from('advisors')
          .select('company_name, user_id')
          .eq('id', invite.advisor_id)
          .single()

        if (advisorError || !advisor) {
          console.error('[send-rfp-email] Advisor not found:', invite.advisor_id, advisorError)
          continue
        }

        // Get profile separately using user_id (correct join)
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', advisor.user_id)
          .single()

        const advisorName = profile?.name || ''
        const companyName = advisor.company_name || 'היועץ'
        
        console.log(`[send-rfp-email] Processing advisor: ${companyName}, name: ${advisorName}, email: ${invite.email}`)

        // Format deadline
        const deadlineDate = new Date(invite.deadline_at).toLocaleDateString('he-IL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        // Build login URL with context
        const loginUrl = `https://billding.ai/auth?type=advisor&mode=login&rfp=${rfp_id}`

        // Parse request files if they exist
        let requestFiles = null
        if (invite.request_files) {
          try {
            requestFiles = typeof invite.request_files === 'string' 
              ? JSON.parse(invite.request_files)
              : invite.request_files
          } catch (e) {
            console.error('[send-rfp-email] Error parsing request_files:', e)
          }
        }

        // Render email template
        const html = await renderAsync(
          React.createElement(RFPInvitationEmail, {
            advisorName,
            companyName,
            projectName: project.name,
            projectType: project.type,
            projectLocation: project.location,
            deadlineDate,
            requestTitle: invite.request_title || undefined,
            requestContent: invite.request_content || undefined,
            requestFiles: requestFiles || undefined,
            loginUrl,
          })
        )

        // Get team member emails
        const teamEmails = await getTeamMemberEmails(supabase, invite.advisor_id, 'rfp_requests');
        
        // Determine recipient emails
        const mainRecipient = test_mode 
          ? 'lior+billding@spartans.tech'
          : invite.email;
        
        const allRecipients = test_mode 
          ? [mainRecipient]
          : [mainRecipient, ...teamEmails];

        console.log(`[send-rfp-email] Sending email to ${allRecipients.length} recipient(s):`, allRecipients)

        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Billding <noreply@billding.ai>',
          to: allRecipients,
          subject: `הזמנה להגשת הצעת מחיר: ${project.name}`,
          html,
          tags: [
            { name: 'type', value: 'rfp_invitation' },
            { name: 'rfp_id', value: rfp_id },
            { name: 'invite_id', value: invite.id },
          ],
        })

        if (emailError) {
          console.error('[send-rfp-email] Resend error:', emailError)
          emailResults.push({
            invite_id: invite.id,
            email: invite.email,
            success: false,
            error: emailError.message,
          })
        } else {
          console.log('[send-rfp-email] Email sent successfully:', emailData)
          emailResults.push({
            invite_id: invite.id,
            email: invite.email,
            success: true,
            message_id: emailData?.id,
          })

          // Update invite status to mark email as delivered
          await supabase
            .from('rfp_invites')
            .update({ delivered_at: new Date().toISOString() })
            .eq('id', invite.id)
        }
      } catch (error) {
        console.error('[send-rfp-email] Error processing invite:', invite.id, error)
        emailResults.push({
          invite_id: invite.id,
          email: invite.email,
          success: false,
          error: error.message,
        })
      }
    }

    const successCount = emailResults.filter((r) => r.success).length
    const failureCount = emailResults.filter((r) => !r.success).length

    console.log(`[send-rfp-email] Complete. Sent: ${successCount}, Failed: ${failureCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        results: emailResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[send-rfp-email] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { withCronSecurity } from '../_shared/cron-auth.ts';

const MAX_RETRY_ATTEMPTS = 3

serve(withCronSecurity('retry-failed-emails', async (_req) => {
  console.log('[retry-failed-emails] Starting retry process')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: failedInvites, error: fetchError } = await supabase
    .from('rfp_invites')
    .select('id, rfp_id, advisor_id, email, email_attempts, email_last_error, email_last_attempt_at')
    .eq('status', 'sent')
    .is('delivered_at', null)
    .lt('email_attempts', MAX_RETRY_ATTEMPTS)
    .order('email_last_attempt_at', { ascending: true, nullsFirst: true })
    .limit(50)

  if (fetchError) throw fetchError

  if (!failedInvites || failedInvites.length === 0) {
    console.log('[retry-failed-emails] No failed invites to retry')
    return new Response(
      JSON.stringify({ success: true, message: 'No failed invites to retry', processed: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[retry-failed-emails] Found ${failedInvites.length} invites to retry`)

  const rfpGroups = new Map<string, typeof failedInvites>()
  for (const invite of failedInvites) {
    const existing = rfpGroups.get(invite.rfp_id) || []
    existing.push(invite)
    rfpGroups.set(invite.rfp_id, existing)
  }

  const results = []

  for (const [rfpId, invites] of rfpGroups) {
    console.log(`[retry-failed-emails] Retrying ${invites.length} invites for RFP ${rfpId}`)
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-rfp-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ rfp_id: rfpId }),
        }
      )
      const result = await response.json()
      results.push({ rfp_id: rfpId, invite_count: invites.length, success: response.ok, result })
      console.log(`[retry-failed-emails] RFP ${rfpId} result:`, result)
    } catch (error: any) {
      console.error(`[retry-failed-emails] Error retrying RFP ${rfpId}:`, error)
      results.push({ rfp_id: rfpId, invite_count: invites.length, success: false, error: error.message })
    }
  }

  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length

  console.log(`[retry-failed-emails] Complete. RFPs: ${results.length}, Success: ${successCount}, Failed: ${failureCount}`)

  return new Response(
    JSON.stringify({
      success: true,
      processed: failedInvites.length,
      rfps_processed: results.length,
      success_count: successCount,
      failure_count: failureCount,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}));

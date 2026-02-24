import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { withCronSecurity } from '../_shared/cron-auth.ts';

serve(withCronSecurity('expire-invites', async (_req) => {
  console.log('[Expire Invites] Starting automated expiration check...')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date().toISOString()

  const { data: expiredInvites, error: findError } = await supabase
    .from('rfp_invites')
    .select('id, advisor_id, rfp_id, email, deadline_at')
    .in('status', ['sent', 'opened', 'in_progress'])
    .lt('deadline_at', now)
    .not('deadline_at', 'is', null)

  if (findError) throw findError

  if (!expiredInvites || expiredInvites.length === 0) {
    console.log('[Expire Invites] No invites to expire')
    return new Response(
      JSON.stringify({ success: true, message: 'No invites to expire', expired_count: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[Expire Invites] Found ${expiredInvites.length} invites to expire`)

  const inviteIds = expiredInvites.map(inv => inv.id)

  const { data: updated, error: updateError } = await supabase
    .from('rfp_invites')
    .update({ status: 'expired', last_notification_at: now })
    .in('id', inviteIds)
    .select()

  if (updateError) throw updateError

  console.log(`[Expire Invites] Successfully expired ${updated?.length || 0} invites`)

  const activityLogs = expiredInvites.map(invite => ({
    actor_type: 'system',
    action: 'rfp_invite_expired',
    entity_type: 'rfp_invite',
    entity_id: invite.id,
    meta: {
      advisor_id: invite.advisor_id,
      rfp_id: invite.rfp_id,
      email: invite.email,
      deadline_at: invite.deadline_at,
      expired_at: now
    }
  }))

  const { error: logError } = await supabase.from('activity_log').insert(activityLogs)
  if (logError) console.error('[Expire Invites] Error logging activities:', logError)

  return new Response(
    JSON.stringify({
      success: true,
      expired_count: updated?.length || 0,
      invites: updated?.map(inv => ({ id: inv.id, email: inv.email, deadline_at: inv.deadline_at }))
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}));

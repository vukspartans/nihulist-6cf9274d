import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Phase 2: Automated RFP Invite Expiration
 * This function runs on a cron schedule to automatically expire invites past their deadline
 */
import { validateCronRequest } from '../_shared/cron-auth.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authError = validateCronRequest(req);
  if (authError) return authError;

  try {
    console.log('[Expire Invites] Starting automated expiration check...')

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current timestamp
    const now = new Date().toISOString()

    // Find all invites that should be expired
    const { data: expiredInvites, error: findError } = await supabase
      .from('rfp_invites')
      .select('id, advisor_id, rfp_id, email, deadline_at')
      .in('status', ['sent', 'opened', 'in_progress'])
      .lt('deadline_at', now)
      .not('deadline_at', 'is', null)

    if (findError) {
      console.error('[Expire Invites] Error finding expired invites:', findError)
      throw findError
    }

    if (!expiredInvites || expiredInvites.length === 0) {
      console.log('[Expire Invites] No invites to expire')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No invites to expire', 
          expired_count: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`[Expire Invites] Found ${expiredInvites.length} invites to expire`)

    // Update all expired invites to 'expired' status
    const inviteIds = expiredInvites.map(inv => inv.id)
    
    const { data: updated, error: updateError } = await supabase
      .from('rfp_invites')
      .update({ 
        status: 'expired',
        last_notification_at: now
      })
      .in('id', inviteIds)
      .select()

    if (updateError) {
      console.error('[Expire Invites] Error updating invites:', updateError)
      throw updateError
    }

    console.log(`[Expire Invites] Successfully expired ${updated?.length || 0} invites`)

    // Log activity for each expired invite
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

    const { error: logError } = await supabase
      .from('activity_log')
      .insert(activityLogs)

    if (logError) {
      console.error('[Expire Invites] Error logging activities:', logError)
      // Don't throw - logging failure shouldn't fail the whole operation
    }

    // Optional: Notify entrepreneurs about expired invites
    // This is commented out to avoid email spam, but can be enabled if needed
    /*
    for (const invite of expiredInvites) {
      await supabase.functions.invoke('notify-invite-expired', {
        body: { invite_id: invite.id }
      })
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: updated?.length || 0,
        invites: updated?.map(inv => ({
          id: inv.id,
          email: inv.email,
          deadline_at: inv.deadline_at
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('[Expire Invites] Fatal error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

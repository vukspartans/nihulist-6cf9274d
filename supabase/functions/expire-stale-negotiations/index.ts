import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STALE_THRESHOLD_DAYS = 30

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[Expire Stale Negotiations] Starting check...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const threshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // Find stale sessions
    const { data: staleSessions, error: findError } = await supabase
      .from('negotiation_sessions')
      .select('id, initiator_id, consultant_advisor_id, project_id, proposal_id, created_at')
      .eq('status', 'awaiting_response')
      .lt('created_at', threshold)

    if (findError) {
      console.error('[Expire Stale Negotiations] Error finding sessions:', findError)
      throw findError
    }

    if (!staleSessions || staleSessions.length === 0) {
      console.log('[Expire Stale Negotiations] No stale sessions found')
      return new Response(
        JSON.stringify({ success: true, message: 'No stale sessions', expired_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`[Expire Stale Negotiations] Found ${staleSessions.length} stale sessions`)

    const sessionIds = staleSessions.map(s => s.id)

    // Cancel all stale sessions
    const { error: updateError } = await supabase
      .from('negotiation_sessions')
      .update({
        status: 'cancelled',
        resolved_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .in('id', sessionIds)

    if (updateError) {
      console.error('[Expire Stale Negotiations] Error updating sessions:', updateError)
      throw updateError
    }

    // Log activity for each expired session
    const activityLogs = staleSessions.map(session => ({
      actor_type: 'system',
      action: 'negotiation_session_expired',
      entity_type: 'negotiation_session',
      entity_id: session.id,
      project_id: session.project_id,
      meta: {
        proposal_id: session.proposal_id,
        consultant_advisor_id: session.consultant_advisor_id,
        created_at: session.created_at,
        expired_at: now.toISOString(),
        threshold_days: STALE_THRESHOLD_DAYS,
      },
    }))

    const { error: logError } = await supabase
      .from('activity_log')
      .insert(activityLogs)

    if (logError) {
      console.error('[Expire Stale Negotiations] Error logging activities:', logError)
    }

    // Enqueue notifications to initiators
    for (const session of staleSessions) {
      try {
        // Get initiator email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('user_id', session.initiator_id)
          .single()

        if (!profile?.email) continue

        // Get advisor name
        const { data: advisor } = await supabase
          .from('advisors')
          .select('company_name')
          .eq('id', session.consultant_advisor_id)
          .single()

        const advisorName = advisor?.company_name || 'יועץ'

        await supabase.rpc('enqueue_notification', {
          p_notification_type: 'negotiation_expired',
          p_recipient_email: profile.email,
          p_recipient_id: session.initiator_id,
          p_subject: `משא ומתן עם ${advisorName} פג תוקף`,
          p_body_html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background-color:#f59e0b;color:white;padding:20px;border-radius:8px 8px 0 0;">
              <h2 style="margin:0;">⏰ משא ומתן פג תוקף</h2>
            </div>
            <div style="padding:20px;background:#fff;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
              <p>שלום ${profile.name || ''},</p>
              <p>המשא ומתן עם <strong>${advisorName}</strong> בוטל אוטומטית לאחר ${STALE_THRESHOLD_DAYS} ימים ללא מענה.</p>
              <p>באפשרותך לשלוח בקשת משא ומתן חדשה או לבחור יועץ אחר.</p>
            </div>
          </div>`,
          p_entity_type: 'negotiation_session',
          p_entity_id: session.id,
          p_priority: 5,
          p_scheduled_for: now.toISOString(),
          p_template_data: '{}',
        })

        console.log(`[Expire Stale Negotiations] Notification enqueued for session ${session.id}`)
      } catch (notifError) {
        console.error(`[Expire Stale Negotiations] Notification error for ${session.id}:`, notifError)
      }
    }

    console.log(`[Expire Stale Negotiations] Successfully expired ${staleSessions.length} sessions`)

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: staleSessions.length,
        sessions: staleSessions.map(s => ({ id: s.id, created_at: s.created_at })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('[Expire Stale Negotiations] Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

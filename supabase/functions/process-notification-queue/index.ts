import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Phase 2: Notification Queue Processor
 * Processes pending notifications from the queue and sends them via email
 * Implements retry logic and failure tracking
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[Notification Queue] Starting queue processing...')

    const { batch_size = 10, test_mode = false } = await req.json().catch(() => ({}))

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get pending notifications, prioritized
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(batch_size)

    if (fetchError) {
      console.error('[Notification Queue] Error fetching notifications:', fetchError)
      throw fetchError
    }

    if (!notifications || notifications.length === 0) {
      console.log('[Notification Queue] No pending notifications')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending notifications', 
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`[Notification Queue] Processing ${notifications.length} notifications`)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as any[]
    }

    // Process each notification
    for (const notification of notifications) {
      try {
        // Mark as processing
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'processing',
            attempts: notification.attempts + 1,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        // Send email
        let emailResponse
        
        if (test_mode) {
          console.log(`[Notification Queue] TEST MODE - Would send to: ${notification.recipient_email}`)
          emailResponse = { data: { id: `test-${notification.id}` }, error: null }
        } else {
          emailResponse = await resend.emails.send({
            from: 'Nihulist <notifications@nihulist.co.il>',
            to: [notification.recipient_email],
            subject: notification.subject,
            html: notification.body_html,
            tags: [
              { name: 'notification_type', value: notification.notification_type },
              { name: 'notification_id', value: notification.id }
            ]
          })
        }

        if (emailResponse.error) {
          throw emailResponse.error
        }

        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            last_error: null
          })
          .eq('id', notification.id)

        console.log(`[Notification Queue] ✓ Sent notification ${notification.id} to ${notification.recipient_email}`)
        results.sent++

      } catch (error: any) {
        console.error(`[Notification Queue] ✗ Failed to send notification ${notification.id}:`, error)
        
        const newAttempts = notification.attempts + 1
        const shouldRetry = newAttempts < notification.max_attempts
        
        // Update status based on retry logic
        await supabase
          .from('notification_queue')
          .update({ 
            status: shouldRetry ? 'pending' : 'failed',
            attempts: newAttempts,
            last_error: error.message || 'Unknown error',
            last_attempt_at: new Date().toISOString(),
            // Schedule retry with exponential backoff if retrying
            scheduled_for: shouldRetry 
              ? new Date(Date.now() + Math.pow(2, newAttempts) * 60000).toISOString() 
              : undefined
          })
          .eq('id', notification.id)

        results.failed++
        results.errors.push({
          notification_id: notification.id,
          email: notification.recipient_email,
          error: error.message,
          will_retry: shouldRetry
        })
      }
    }

    console.log(`[Notification Queue] Completed: ${results.sent} sent, ${results.failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: notifications.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('[Notification Queue] Fatal error:', error)
    
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

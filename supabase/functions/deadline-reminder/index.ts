import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find RFPs expiring in 24 hours
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 25 * 60 * 60 * 1000);

    const { data: invites, error } = await supabase
      .from("rfp_invites")
      .select(`
        id,
        deadline_at,
        email,
        rfps!inner(id, subject),
        advisors!inner(company_name)
      `)
      .in('status', ['sent', 'opened', 'in_progress'])
      .gte('deadline_at', tomorrow.toISOString())
      .lt('deadline_at', dayAfter.toISOString())
      .is('last_notification_at', null);

    if (error) {
      console.error('[deadline-reminder] Query error:', error);
      throw error;
    }

    console.log(`[deadline-reminder] Found ${invites?.length || 0} expiring RFPs`);

    const results = [];
    for (const invite of invites || []) {
      console.log(`[deadline-reminder] Reminding ${invite.email} about RFP ${invite.rfps.id}`);

      // TODO: Send reminder email
      // This would integrate with Resend or another email service

      // Mark as notified
      await supabase
        .from("rfp_invites")
        .update({ last_notification_at: new Date().toISOString() })
        .eq("id", invite.id);

      results.push({ invite_id: invite.id, status: 'notified' });
    }

    return new Response(
      JSON.stringify({ success: true, notified: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[deadline-reminder] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

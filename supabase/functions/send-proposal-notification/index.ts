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

    const { proposal_id } = await req.json();

    if (!proposal_id) {
      return new Response(
        JSON.stringify({ error: 'Missing proposal_id' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get proposal with project and advisor details
    const { data: proposal, error } = await supabase
      .from("proposals")
      .select(`
        id,
        price,
        timeline_days,
        project_id,
        projects!inner(name, owner_id, profiles!inner(name, email)),
        advisors!inner(company_name)
      `)
      .eq("id", proposal_id)
      .single();

    if (error || !proposal) {
      console.error('[send-proposal-notification] Proposal not found:', error);
      throw new Error('Proposal not found');
    }

    console.log(`[send-proposal-notification] Notifying ${proposal.projects.profiles.email} about proposal ${proposal_id}`);

    // TODO: Send email notification to entrepreneur
    // This would integrate with Resend or another email service

    // Log activity
    await supabase.from("activity_log").insert({
      actor_id: proposal.projects.owner_id,
      actor_type: 'system',
      action: 'proposal_notification_sent',
      entity_type: 'proposal',
      entity_id: proposal_id,
      meta: {
        entrepreneur_email: proposal.projects.profiles.email,
        advisor_company: proposal.advisors.company_name
      }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[send-proposal-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

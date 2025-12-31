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

    interface SendRFPRequest {
      rfp_id: string;
      advisor_ids: string[];
      deadline_hours?: number;
    }

    const {
      rfp_id,
      advisor_ids,
      deadline_hours = 168 // 7 days default
    }: SendRFPRequest = await req.json();

    // Validate inputs
    if (!rfp_id || !Array.isArray(advisor_ids) || advisor_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: rfp_id, advisor_ids' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-rfp-with-deadline] Processing ${advisor_ids.length} invitations for RFP ${rfp_id}`);

    const deadline_at = new Date(Date.now() + deadline_hours * 60 * 60 * 1000);
    const results = [];

    for (const advisor_id of advisor_ids) {
      // Get advisor details with profiles
      const { data: advisor, error: advisorError } = await supabase
        .from("advisors")
        .select(`
          id,
          user_id,
          company_name,
          profiles!inner(email, name, admin_approved)
        `)
        .eq("id", advisor_id)
        .single();

      if (advisorError || !advisor) {
        console.error('Advisor not found:', advisor_id);
        continue;
      }

      // Check for existing active invite for this advisor + RFP combination
      const { data: existingInvite } = await supabase
        .from("rfp_invites")
        .select("id, status")
        .eq("rfp_id", rfp_id)
        .eq("advisor_id", advisor_id)
        .not("status", "in", '("declined","expired")')
        .maybeSingle();

      if (existingInvite) {
        console.log(`[send-rfp-with-deadline] Skipping duplicate invite for advisor ${advisor_id} - existing invite ${existingInvite.id} with status ${existingInvite.status}`);
        results.push({
          advisor_id,
          invite_id: existingInvite.id,
          status: 'already_exists',
          deadline_at
        });
        continue;
      }

      // Generate secure token
      const submit_token = crypto.randomUUID();
      
      // Create new RFP invite (no upsert - we've already checked for duplicates)
      const { data: invite, error: inviteError } = await supabase
        .from("rfp_invites")
        .insert({
          rfp_id,
          advisor_id,
          email: advisor.profiles.email,
          submit_token,
          deadline_at: deadline_at.toISOString(),
          status: 'sent'
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invite:', inviteError);
        continue;
      }

      // Determine email flow based on admin approval
      const isApproved = advisor.profiles?.admin_approved;
      const targetUrl = `${Deno.env.get("SUPABASE_URL")?.replace('https://', 'https://app.')}/rfp-details/${rfp_id}`;

      // Log activity
      await supabase.from("activity_log").insert({
        actor_id: advisor.user_id,
        actor_type: 'system',
        action: 'rfp_invitation_sent',
        entity_type: 'rfp_invite',
        entity_id: invite.id,
        meta: {
          advisor_id,
          rfp_id,
          deadline_at: deadline_at.toISOString(),
          is_approved: isApproved
        }
      });

      results.push({
        advisor_id,
        invite_id: invite.id,
        status: 'sent',
        deadline_at
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        invites_sent: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

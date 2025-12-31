import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.31";
import { ProposalRejectedEmail } from "../_shared/email-templates/proposal-rejected.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  proposal_id: string;
  rejection_reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create client with user's auth
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body: RequestBody = await req.json();
    console.log("[Reject Proposal] Input:", JSON.stringify(body, null, 2));

    const { proposal_id, rejection_reason } = body;

    if (!proposal_id) {
      throw new Error("Missing required field: proposal_id");
    }

    // Service role client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get proposal with project details (first query)
    // Use explicit foreign key name to avoid PostgREST resolution issues
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(`
        id, price, status, advisor_id, project_id,
        project:project_id (id, name, owner_id),
        advisors!fk_proposals_advisor (id, company_name, user_id)
      `)
      .eq("id", proposal_id)
      .single();

    if (proposalError) {
      console.error("[Reject Proposal] Proposal query error:", JSON.stringify(proposalError, null, 2));
      console.error("[Reject Proposal] Proposal ID:", proposal_id);
      throw new Error(`Proposal query failed: ${proposalError.message || JSON.stringify(proposalError)}`);
    }
    
    if (!proposal) {
      console.error("[Reject Proposal] Proposal not found for ID:", proposal_id);
      throw new Error("Proposal not found");
    }
    
    console.log("[Reject Proposal] Proposal found:", {
      id: proposal.id,
      status: proposal.status,
      advisor_id: proposal.advisor_id,
      project_id: proposal.project_id,
      has_project: !!proposal.project,
      has_advisor: !!proposal.advisors
    });

    const projectData = proposal.project as any;
    const advisorData = proposal.advisors as any;
    
    // Validate initiator is project owner
    if (!projectData || projectData.owner_id !== user.id) {
      throw new Error("Not authorized - must be project owner");
    }

    // Get advisor profile separately (second query)
    let advisorEmail: string | null = null;
    let advisorName: string | null = null;
    
    if (advisorData?.user_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("user_id", advisorData.user_id)
        .single();
      
      if (!profileError && profile) {
        advisorEmail = profile.email;
        advisorName = profile.name;
      } else {
        console.warn("[Reject Proposal] Profile not found for advisor user_id:", advisorData.user_id);
      }
    }

    // Check proposal status
    if (["accepted", "rejected", "withdrawn"].includes(proposal.status)) {
      throw new Error(`Proposal already ${proposal.status}`);
    }

    // Call database function to reject with cleanup
    // Pass owner_id explicitly since we're using service role key
    const { data: result, error: rpcError } = await supabase.rpc(
      "reject_proposal_with_cleanup",
      {
        p_proposal_id: proposal_id,
        p_rejection_reason: rejection_reason,
        p_owner_id: user.id,  // Pass owner_id explicitly for service role context
      }
    );

    if (rpcError) {
      console.error("[Reject Proposal] RPC error:", rpcError);
      throw new Error(`Failed to reject proposal: ${rpcError.message}`);
    }

    console.log("[Reject Proposal] Result:", result);

    // Send rejection email to advisor (email already fetched above)

    if (advisorEmail) {
      const resend = new Resend(RESEND_API_KEY);

      const dashboardUrl = "https://billding.ai/advisor-dashboard";

      const emailHtml = await renderAsync(
        ProposalRejectedEmail({
          advisorCompany: advisorData.company_name || "יועץ",
          projectName: projectData.name,
          rejectionReason: rejection_reason,
          dashboardUrl,
        })
      );

      await resend.emails.send({
        from: "Billding <notifications@billding.ai>",
        to: advisorEmail,
        subject: `הצעת המחיר נדחתה - ${projectData.name}`,
        html: emailHtml,
      });

      console.log("[Reject Proposal] Email sent to:", advisorEmail);

      // Send to team members with updates preference
      const { data: teamMembers } = await supabase
        .from("advisor_team_members")
        .select("email, notification_preferences")
        .eq("advisor_id", proposal.advisor_id)
        .eq("is_active", true);

      if (teamMembers) {
        for (const member of teamMembers) {
          if (
            member.notification_preferences.includes("all") ||
            member.notification_preferences.includes("updates")
          ) {
            await resend.emails.send({
              from: "Billding <notifications@billding.ai>",
              to: member.email,
              subject: `הצעת המחיר נדחתה - ${projectData.name}`,
              html: emailHtml,
            });
            console.log("[Reject Proposal] Team email sent to:", member.email);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Reject Proposal] Error:", error);
    console.error("[Reject Proposal] Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.substring(0, 500)
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        error_details: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

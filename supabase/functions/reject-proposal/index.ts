import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
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

    // Get proposal with project and advisor details
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(`
        id, price, status, advisor_id, project_id,
        project:project_id (id, name, owner_id),
        advisors:advisor_id (
          id, company_name, user_id,
          profiles:user_id (email, name)
        )
      `)
      .eq("id", proposal_id)
      .single();

    if (proposalError || !proposal) {
      throw new Error("Proposal not found");
    }

    const projectData = proposal.project as any;
    
    // Validate initiator is project owner
    if (projectData.owner_id !== user.id) {
      throw new Error("Not authorized - must be project owner");
    }

    // Check proposal status
    if (["accepted", "rejected", "withdrawn"].includes(proposal.status)) {
      throw new Error(`Proposal already ${proposal.status}`);
    }

    // Call database function to reject with cleanup
    const { data: result, error: rpcError } = await supabase.rpc(
      "reject_proposal_with_cleanup",
      {
        p_proposal_id: proposal_id,
        p_rejection_reason: rejection_reason,
      }
    );

    if (rpcError) {
      console.error("[Reject Proposal] RPC error:", rpcError);
      throw new Error(`Failed to reject proposal: ${rpcError.message}`);
    }

    console.log("[Reject Proposal] Result:", result);

    // Send rejection email to advisor
    const advisorData = proposal.advisors as any;
    const advisorEmail = advisorData?.profiles?.email;

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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

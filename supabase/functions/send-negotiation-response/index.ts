import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { NegotiationResponseEmail } from "../_shared/email-templates/negotiation-response.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdatedLineItem {
  line_item_id: string;
  consultant_response_price: number;
  consultant_note?: string;
}

interface RequestBody {
  session_id: string;
  consultant_message?: string;
  updated_line_items: UpdatedLineItem[];
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
    console.log("[Negotiation Response] Input:", JSON.stringify(body, null, 2));

    const { session_id, consultant_message, updated_line_items } = body;

    if (!session_id || !updated_line_items || updated_line_items.length === 0) {
      throw new Error("Missing required fields: session_id, updated_line_items");
    }

    // Service role client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get session and validate consultant ownership
    const { data: session, error: sessionError } = await supabase
      .from("negotiation_sessions")
      .select(`
        *,
        proposal:proposal_id (
          id, price, advisor_id, project_id, current_version,
          advisors:advisor_id (id, company_name, user_id)
        ),
        project:project_id (id, name, owner_id)
      `)
      .eq("id", session_id)
      .eq("status", "awaiting_response")
      .single();

    if (sessionError || !session) {
      throw new Error("Negotiation session not found or not awaiting response");
    }

    // Validate consultant owns the advisor
    const advisorData = (session.proposal as any)?.advisors;
    if (!advisorData || advisorData.user_id !== user.id) {
      throw new Error("Not authorized - must be the consultant for this negotiation");
    }

    // Call the database function to create new version
    const { data: result, error: rpcError } = await supabase.rpc(
      "submit_negotiation_response",
      {
        p_session_id: session_id,
        p_updated_line_items: updated_line_items,
        p_consultant_message: consultant_message,
      }
    );

    if (rpcError) {
      console.error("[Negotiation Response] RPC error:", rpcError);
      throw new Error(`Failed to submit response: ${rpcError.message}`);
    }

    console.log("[Negotiation Response] RPC result:", result);

    // Get entrepreneur details for email
    const projectData = session.project as any;
    const { data: entrepreneurProfile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("user_id", projectData.owner_id)
      .single();

    // Calculate new total
    const newTotal = updated_line_items.reduce(
      (sum, item) => sum + item.consultant_response_price,
      0
    );

    // Send email to entrepreneur
    if (entrepreneurProfile?.email) {
      const resend = new Resend(RESEND_API_KEY);

      const proposalUrl = `https://billding.ai/projects/${projectData.id}?tab=proposals&proposal=${(session.proposal as any).id}`;

      const emailHtml = await renderAsync(
        NegotiationResponseEmail({
          entrepreneurName: entrepreneurProfile.name || "יזם",
          advisorCompany: advisorData.company_name || "יועץ",
          projectName: projectData.name,
          previousPrice: (session.proposal as any).price,
          newPrice: newTotal,
          consultantMessage: consultant_message,
          proposalUrl,
          locale: "he",
        })
      );

      await resend.emails.send({
        from: "Billding <notifications@billding.ai>",
        to: entrepreneurProfile.email,
        subject: `הצעה מעודכנת התקבלה - ${projectData.name}`,
        html: emailHtml,
      });

      console.log("[Negotiation Response] Email sent to:", entrepreneurProfile.email);
    }

    // Log activity
    await supabase.from("activity_log").insert({
      actor_id: user.id,
      actor_type: "advisor",
      action: "negotiation_responded",
      entity_type: "proposal",
      entity_id: (session.proposal as any).id,
      project_id: projectData.id,
      meta: {
        session_id,
        new_version_id: result.new_version_id,
        new_version_number: result.new_version_number,
        new_price: newTotal,
      },
    });

    return new Response(
      JSON.stringify({
        new_version_id: result.new_version_id,
        new_version_number: result.new_version_number,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Negotiation Response] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { NegotiationRequestEmail } from "../_shared/email-templates/negotiation-request.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LineItemAdjustment {
  line_item_id: string;
  adjustment_type: 'price_change' | 'flat_discount' | 'percentage_discount';
  adjustment_value: number;
  initiator_note?: string;
}

interface NegotiationCommentInput {
  comment_type: 'document' | 'scope' | 'milestone' | 'payment' | 'general';
  content: string;
  entity_reference?: string;
}

interface RequestBody {
  project_id: string;
  proposal_id: string;
  negotiated_version_id: string;
  target_total?: number;
  target_reduction_percent?: number;
  global_comment?: string;
  bulk_message?: string;
  line_item_adjustments?: LineItemAdjustment[];
  comments?: NegotiationCommentInput[];
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
    console.log("[Negotiation Request] Input:", JSON.stringify(body, null, 2));

    const {
      project_id,
      proposal_id,
      negotiated_version_id,
      target_total,
      target_reduction_percent,
      global_comment,
      line_item_adjustments,
      comments,
    } = body;

    // Validate required fields
    if (!project_id || !proposal_id || !negotiated_version_id) {
      throw new Error("Missing required fields: project_id, proposal_id, negotiated_version_id");
    }

    // Service role client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate initiator is project owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, owner_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    if (project.owner_id !== user.id) {
      throw new Error("Not authorized - must be project owner");
    }

    // Get proposal details (separate queries to avoid nested FK issue)
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("id, price, advisor_id, status, negotiation_count")
      .eq("id", proposal_id)
      .single();

    if (proposalError || !proposal) {
      console.error("[Negotiation Request] Proposal query error:", proposalError);
      throw new Error("Proposal not found");
    }

    // Get advisor details
    const { data: advisor, error: advisorError } = await supabase
      .from("advisors")
      .select("id, company_name, user_id")
      .eq("id", proposal.advisor_id)
      .single();

    if (advisorError || !advisor) {
      console.error("[Negotiation Request] Advisor query error:", advisorError);
      throw new Error("Advisor not found for proposal");
    }

    // Get advisor profile for email
    const { data: advisorProfile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("user_id", advisor.user_id)
      .maybeSingle();

    // Check for existing active negotiation on this version
    const { data: existingSession } = await supabase
      .from("negotiation_sessions")
      .select("id")
      .eq("negotiated_version_id", negotiated_version_id)
      .in("status", ["open", "awaiting_response"])
      .maybeSingle();

    if (existingSession) {
      console.log("[Negotiation Request] Active session exists:", existingSession.id);
      return new Response(
        JSON.stringify({
          error: "ACTIVE_NEGOTIATION_EXISTS",
          message: "קיימת בקשת עדכון פעילה עבור הצעה זו",
          existing_session_id: existingSession.id,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get entrepreneur profile
    const { data: entrepreneurProfile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("user_id", user.id)
      .single();

    // Create negotiation session
    const { data: session, error: sessionError } = await supabase
      .from("negotiation_sessions")
      .insert({
        project_id,
        proposal_id,
        negotiated_version_id,
        initiator_id: user.id,
        consultant_advisor_id: proposal.advisor_id,
        status: "awaiting_response",
        target_total,
        target_reduction_percent,
        global_comment,
        initiator_message: global_comment,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("[Negotiation Request] Session creation error:", sessionError);
      throw new Error(`Failed to create negotiation session: ${sessionError.message}`);
    }

    console.log("[Negotiation Request] Session created:", session.id);

    // Create line item negotiations if provided
    if (line_item_adjustments && line_item_adjustments.length > 0) {
      const lineItemRecords = line_item_adjustments.map((adj) => {
        let targetPrice = 0;
        // We need to get original price from line_items
        // For now, calculate based on adjustment
        if (adj.adjustment_type === "price_change") {
          targetPrice = adj.adjustment_value;
        }
        
        return {
          session_id: session.id,
          line_item_id: adj.line_item_id,
          adjustment_type: adj.adjustment_type,
          adjustment_value: adj.adjustment_value,
          original_price: 0, // Will be updated by trigger or separate query
          initiator_target_price: targetPrice,
          initiator_note: adj.initiator_note,
        };
      });

      // Get original prices for line items
      const lineItemIds = line_item_adjustments.map((a) => a.line_item_id);
      const { data: originalLineItems } = await supabase
        .from("proposal_line_items")
        .select("id, total")
        .in("id", lineItemIds);

      const priceMap = new Map(originalLineItems?.map((li) => [li.id, li.total]) || []);

      // Update records with original prices and calculate target prices
      for (const record of lineItemRecords) {
        const originalPrice = priceMap.get(record.line_item_id) || 0;
        record.original_price = originalPrice;

        const adj = line_item_adjustments.find((a) => a.line_item_id === record.line_item_id);
        if (adj) {
          if (adj.adjustment_type === "price_change") {
            record.initiator_target_price = adj.adjustment_value;
          } else if (adj.adjustment_type === "flat_discount") {
            record.initiator_target_price = originalPrice - adj.adjustment_value;
          } else if (adj.adjustment_type === "percentage_discount") {
            record.initiator_target_price = originalPrice * (1 - adj.adjustment_value / 100);
          }
        }
      }

      const { error: lineItemError } = await supabase
        .from("line_item_negotiations")
        .insert(lineItemRecords);

      if (lineItemError) {
        console.error("[Negotiation Request] Line item negotiations error:", lineItemError);
      }
    }

    // Create negotiation comments if provided
    if (comments && comments.length > 0) {
      const commentRecords = comments.map((c) => ({
        session_id: session.id,
        author_id: user.id,
        author_type: "initiator",
        comment_type: c.comment_type,
        content: c.content,
        entity_reference: c.entity_reference,
      }));

      const { error: commentsError } = await supabase
        .from("negotiation_comments")
        .insert(commentRecords);

      if (commentsError) {
        console.error("[Negotiation Request] Comments error:", commentsError);
      }
    }

    // Update proposal status
    await supabase
      .from("proposals")
      .update({
        status: "negotiation_requested",
        has_active_negotiation: true,
        negotiation_count: (proposal.negotiation_count || 0) + 1,
      })
      .eq("id", proposal_id);

    // Send email to consultant
    const advisorEmail = advisorProfile?.email;
    const advisorCompany = advisor.company_name || "יועץ";

    if (advisorEmail) {
      const resend = new Resend(RESEND_API_KEY);

      const responseUrl = `https://billding.ai/advisor-dashboard?negotiation=${session.id}`;

      const emailHtml = await renderAsync(
        NegotiationRequestEmail({
          advisorCompany,
          entrepreneurName: entrepreneurProfile?.name || "יזם",
          projectName: project.name,
          originalPrice: proposal.price,
          targetPrice: target_total,
          targetReductionPercent: target_reduction_percent,
          globalComment: global_comment,
          responseUrl,
          locale: "he",
        })
      );

      await resend.emails.send({
        from: "Billding <notifications@billding.ai>",
        to: advisorEmail,
        subject: `בקשה לעדכון הצעת מחיר - ${project.name}`,
        html: emailHtml,
      });

      console.log("[Negotiation Request] Email sent to:", advisorEmail);

      // Send to team members with rfp_requests preference
      const { data: teamMembers } = await supabase
        .from("advisor_team_members")
        .select("email, notification_preferences")
        .eq("advisor_id", proposal.advisor_id)
        .eq("is_active", true);

      if (teamMembers) {
        for (const member of teamMembers) {
          if (
            member.notification_preferences.includes("all") ||
            member.notification_preferences.includes("rfp_requests")
          ) {
            await resend.emails.send({
              from: "Billding <notifications@billding.ai>",
              to: member.email,
              subject: `בקשה לעדכון הצעת מחיר - ${project.name}`,
              html: emailHtml,
            });
            console.log("[Negotiation Request] Team email sent to:", member.email);
          }
        }
      }
    }

    // Log activity
    await supabase.from("activity_log").insert({
      actor_id: user.id,
      actor_type: "entrepreneur",
      action: "negotiation_requested",
      entity_type: "proposal",
      entity_id: proposal_id,
      project_id,
      meta: {
        session_id: session.id,
        target_total,
        target_reduction_percent,
      },
    });

    return new Response(
      JSON.stringify({
        session_id: session.id,
        created_at: session.created_at,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Negotiation Request] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

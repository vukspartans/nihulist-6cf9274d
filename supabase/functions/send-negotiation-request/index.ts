import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.31";
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

interface UploadedFile {
  id?: string;          // Database ID from negotiation_files table
  name: string;
  url: string;
  size: number;
  storagePath?: string;
}

interface MilestoneAdjustment {
  milestone_id: string;
  original_percentage: number;
  target_percentage: number;
  initiator_note?: string;
}

interface RequestBody {
  project_id: string;
  proposal_id: string;
  negotiated_version_id?: string | null;  // Made optional - will be created if not provided
  target_total?: number;
  target_reduction_percent?: number;
  global_comment?: string;
  bulk_message?: string;
  line_item_adjustments?: LineItemAdjustment[];
  milestone_adjustments?: MilestoneAdjustment[];
  comments?: NegotiationCommentInput[];
  files?: UploadedFile[];
  supplier_name?: string;  // Added for response message
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
      milestone_adjustments,
      comments,
      files,
    } = body;

    // Validate required fields
    if (!project_id || !proposal_id) {
      throw new Error("Missing required fields: project_id, proposal_id");
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
      .select("id, price, timeline_days, scope_text, terms, conditions_json, advisor_id, status, negotiation_count, supplier_name")
      .eq("id", proposal_id)
      .single();

    if (proposalError || !proposal) {
      console.error("[Negotiation Request] Proposal query error:", proposalError);
      throw new Error("Proposal not found");
    }

    // Create version if not provided (bypasses RLS as we're using service role)
    let finalVersionId = negotiated_version_id;
    if (!finalVersionId) {
      console.log("[Negotiation Request] Creating initial proposal version");
      const { data: newVersion, error: versionError } = await supabase
        .from("proposal_versions")
        .insert({
          proposal_id,
          version_number: 1,
          price: proposal.price,
          timeline_days: proposal.timeline_days,
          scope_text: proposal.scope_text,
          terms: proposal.terms,
          conditions_json: proposal.conditions_json,
          change_reason: "גרסה ראשונית",
        })
        .select("id")
        .single();

      if (versionError || !newVersion) {
        console.error("[Negotiation Request] Version creation error:", versionError);
        throw new Error("Failed to create proposal version");
      }
      finalVersionId = newVersion.id;
      console.log("[Negotiation Request] Created version:", finalVersionId);
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

    // Check for existing active negotiation on this proposal
    const { data: existingSession } = await supabase
      .from("negotiation_sessions")
      .select("id")
      .eq("proposal_id", proposal_id)
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
        negotiated_version_id: finalVersionId,
        initiator_id: user.id,
        consultant_advisor_id: proposal.advisor_id,
        status: "awaiting_response",
        target_total,
        target_reduction_percent,
        global_comment,
        initiator_message: global_comment,
        files: files || [],
        milestone_adjustments: milestone_adjustments || [],
      })
      .select()
      .single();

    if (sessionError) {
      console.error("[Negotiation Request] Session creation error:", sessionError);
      throw new Error(`Failed to create negotiation session: ${sessionError.message}`);
    }

    console.log("[Negotiation Request] Session created:", session.id);

    // Create line item negotiations if provided
    // UUID regex pattern for validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (line_item_adjustments && line_item_adjustments.length > 0) {
      // Filter out items with synthetic IDs (non-UUID like "idx-6")
      // These are items from fee_line_items JSON that don't have database records
      const validAdjustments = line_item_adjustments.filter((adj) => 
        uuidRegex.test(adj.line_item_id)
      );
      
      console.log(`[Negotiation Request] Filtered ${line_item_adjustments.length - validAdjustments.length} synthetic IDs, ${validAdjustments.length} valid line items`);

      if (validAdjustments.length > 0) {
        // IMPORTANT: Verify line_item_id actually exists in proposal_line_items table
        // Items from fee_line_items JSON have UUIDs but may not exist in the table
        const lineItemIds = validAdjustments.map((a) => a.line_item_id);
        const { data: existingLineItems } = await supabase
          .from("proposal_line_items")
          .select("id, total")
          .eq("proposal_id", proposal_id)
          .in("id", lineItemIds);

        const existingIds = new Set((existingLineItems || []).map((li) => li.id));
        const priceMap = new Map((existingLineItems || []).map((li) => [li.id, li.total]));
        
        // Only insert adjustments for line items that exist in the database
        const dbValidAdjustments = validAdjustments.filter((a) => existingIds.has(a.line_item_id));
        const jsonOnlyAdjustments = validAdjustments.filter((a) => !existingIds.has(a.line_item_id));
        
        console.log(`[Negotiation Request] ${dbValidAdjustments.length} DB items, ${jsonOnlyAdjustments.length} JSON-only items (stored in session)`);

        // Store JSON-only adjustments in the session for reference
        if (jsonOnlyAdjustments.length > 0) {
          await supabase
            .from("negotiation_sessions")
            .update({
              files: {
                ...((files as any) || {}),
                json_line_item_adjustments: jsonOnlyAdjustments,
              },
            })
            .eq("id", session.id);
        }

        if (dbValidAdjustments.length > 0) {
          const lineItemRecords = dbValidAdjustments.map((adj) => {
            const originalPrice = priceMap.get(adj.line_item_id) || 0;
            let targetPrice = 0;
            
            if (adj.adjustment_type === "price_change") {
              targetPrice = adj.adjustment_value;
            } else if (adj.adjustment_type === "flat_discount") {
              targetPrice = originalPrice - adj.adjustment_value;
            } else if (adj.adjustment_type === "percentage_discount") {
              targetPrice = originalPrice * (1 - adj.adjustment_value / 100);
            }
            
            return {
              session_id: session.id,
              line_item_id: adj.line_item_id,
              adjustment_type: adj.adjustment_type,
              adjustment_value: adj.adjustment_value,
              original_price: originalPrice,
              initiator_target_price: targetPrice,
              initiator_note: adj.initiator_note,
            };
          });

          const { data: insertedLineItems, error: lineItemError } = await supabase
            .from("line_item_negotiations")
            .insert(lineItemRecords)
            .select();

          if (lineItemError) {
            console.error("[Negotiation Request] Line item negotiations error:", lineItemError);
            throw new Error(`Failed to save line item adjustments: ${lineItemError.message}`);
          }
          console.log("[Negotiation Request] Line items created:", insertedLineItems?.length);
        }
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

      const { data: insertedComments, error: commentsError } = await supabase
        .from("negotiation_comments")
        .insert(commentRecords)
        .select();

      if (commentsError) {
        console.error("[Negotiation Request] Comments error:", commentsError);
        throw new Error(`Failed to save negotiation comments: ${commentsError.message}`);
      }
      console.log("[Negotiation Request] Comments created:", insertedComments?.length);
    }

    // Link uploaded files to the session in negotiation_files table
    if (files && files.length > 0) {
      console.log("[Negotiation Request] Linking files to session:", files.length);
      for (const file of files) {
        if (file.id) {
          const { error: fileUpdateError } = await supabase
            .from("negotiation_files")
            .update({
              session_id: session.id,
              used_at: new Date().toISOString(),
            })
            .eq("id", file.id);

          if (fileUpdateError) {
            console.error("[Negotiation Request] File link error:", fileUpdateError);
          }
        }
      }
      console.log("[Negotiation Request] Files linked to session");
    }

    // Update proposal status
    const { error: proposalUpdateError } = await supabase
      .from("proposals")
      .update({
        status: "negotiation_requested",
        has_active_negotiation: true,
        negotiation_count: (proposal.negotiation_count || 0) + 1,
      })
      .eq("id", proposal_id);

    if (proposalUpdateError) {
      console.error("[Negotiation Request] Proposal update error:", proposalUpdateError);
      throw new Error(`Failed to update proposal status: ${proposalUpdateError.message}`);
    }
    console.log("[Negotiation Request] Proposal status updated to negotiation_requested");

    // Send email to consultant
    const advisorEmail = advisorProfile?.email;
    const advisorCompany = advisor.company_name || "יועץ";

    if (advisorEmail) {
      const resend = new Resend(RESEND_API_KEY);

      const responseUrl = `https://billding.ai/negotiation/${session.id}`;

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
        supplier_name: proposal.supplier_name || advisor.company_name,
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

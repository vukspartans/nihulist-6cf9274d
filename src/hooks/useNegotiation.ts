import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  NegotiationRequestInput,
  NegotiationResponseInput,
  NegotiationRequestOutput,
  NegotiationResponseOutput,
  NegotiationSession,
  NegotiationSessionWithDetails,
} from "@/types/negotiation";

export const useNegotiation = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createNegotiationSession = async (
    data: NegotiationRequestInput
  ): Promise<NegotiationRequestOutput | null | { existingSession: true; sessionId: string }> => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "send-negotiation-request",
        { body: data }
      );

      if (error) throw error;

      // Show success with vendor name
      const supplierName = result?.supplier_name || "היועץ";
      toast({
        title: "✓ בקשת העדכון נשלחה בהצלחה",
        description: `הבקשה נשלחה ל${supplierName}. תקבל עדכון כשיגיב להצעה.`,
      });

      return result as NegotiationRequestOutput;
    } catch (error: any) {
      console.error("[useNegotiation] createNegotiationSession error:", error);

      // Handle 409 Conflict - existing negotiation
      // Supabase Functions errors may expose response details via error.context (Response)
      if (error?.context) {
        try {
          const raw = await error.context.text();
          const errorBody = raw ? JSON.parse(raw) : null;
          if (errorBody?.error === "ACTIVE_NEGOTIATION_EXISTS") {
            toast({
              title: "בקשה קיימת",
              description: "קיימת כבר בקשת עדכון פעילה להצעה זו",
            });
            return { existingSession: true, sessionId: errorBody.existing_session_id };
          }
        } catch (parseError) {
          console.error("[useNegotiation] Error parsing context:", parseError);
        }
      }

      // Fallback: detect the condition even if context isn't available
      if (String(error?.message || "").includes("ACTIVE_NEGOTIATION_EXISTS")) {
        toast({
          title: "בקשה קיימת",
          description: "קיימת כבר בקשת עדכון פעילה להצעה זו",
        });
      } else {
        toast({
          title: "שגיאה",
          description: error.message || "לא ניתן לשלוח את הבקשה",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const respondToNegotiation = async (
    data: NegotiationResponseInput
  ): Promise<NegotiationResponseOutput | null> => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "send-negotiation-response",
        { body: data }
      );

      if (error) throw error;

      toast({
        title: "✓ הצעה מעודכנת נשלחה בהצלחה",
        description: "ההצעה המעודכנת נשלחה ליזם. תקבל עדכון כשיגיב להצעה.",
      });

      return result as NegotiationResponseOutput;
    } catch (error: any) {
      console.error("[useNegotiation] respondToNegotiation error:", error);
      
      // Try to parse specific error messages from the edge function
      let errorMessage = "לא ניתן לשלוח את ההצעה";
      
      if (error?.context) {
        try {
          const errorBody = await error.context.json();
          if (errorBody?.error?.includes("not awaiting response")) {
            errorMessage = "כבר שלחת תגובה לבקשה זו או שהמשא ומתן הסתיים";
          } else if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch (parseError) {
          console.error("[useNegotiation] Error parsing context:", parseError);
        }
      }
      
      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelNegotiation = async (sessionId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("negotiation_sessions")
        .update({
          status: "cancelled",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Update proposal
      const { data: session } = await supabase
        .from("negotiation_sessions")
        .select("proposal_id")
        .eq("id", sessionId)
        .single();

      if (session) {
        await supabase
          .from("proposals")
          .update({ has_active_negotiation: false })
          .eq("id", session.proposal_id);
      }

      toast({
        title: "בקשה בוטלה",
        description: "בקשת המשא ומתן בוטלה",
      });

      return true;
    } catch (error: any) {
      console.error("[useNegotiation] cancelNegotiation error:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לבטל את הבקשה",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchNegotiationByProposal = async (
    proposalId: string,
    activeOnly: boolean = false
  ): Promise<NegotiationSession | null> => {
    try {
      const statuses: ("open" | "awaiting_response" | "responded" | "cancelled" | "resolved")[] = activeOnly 
        ? ["awaiting_response"] 
        : ["open", "awaiting_response", "responded"];
      
      const { data, error } = await supabase
        .from("negotiation_sessions")
        .select("*")
        .eq("proposal_id", proposalId)
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as NegotiationSession | null;
    } catch (error) {
      console.error("[useNegotiation] fetchNegotiationByProposal error:", error);
      return null;
    }
  };

  const fetchNegotiationWithDetails = async (
    sessionId: string
  ): Promise<NegotiationSessionWithDetails | null> => {
    try {
      const { data: session, error: sessionError } = await supabase
        .from("negotiation_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Fetch related data including fee_line_items and initiator profile
      const [proposalRes, projectRes, advisorRes, lineItemsRes, commentsRes, initiatorRes] =
        await Promise.all([
          supabase
            .from("proposals")
            .select("id, price, supplier_name, current_version, advisor_id, fee_line_items, milestone_adjustments, rfp_invite_id")
            .eq("id", session.proposal_id)
            .single(),
          supabase
            .from("projects")
            .select("id, name, owner_id")
            .eq("id", session.project_id)
            .single(),
          supabase
            .from("advisors")
            .select("id, company_name, user_id")
            .eq("id", session.consultant_advisor_id)
            .single(),
          supabase
            .from("line_item_negotiations")
            .select("*")
            .eq("session_id", sessionId),
          supabase
            .from("negotiation_comments")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true }),
          supabase
            .from("profiles")
            .select("name, company_name, organization_id")
            .eq("user_id", session.initiator_id)
            .single(),
        ]);

      // Parse fee_line_items from JSON - safely cast with calculated totals
      const rawFeeLineItems = proposalRes.data?.fee_line_items;
      const feeLineItems = Array.isArray(rawFeeLineItems) 
        ? rawFeeLineItems.map((item: any) => ({
            item_id: item?.item_id,
            item_number: item?.item_number,
            description: item?.description || '',
            unit: item?.unit,
            quantity: item?.quantity,
            unit_price: item?.unit_price,
            total: item?.total ?? ((item?.unit_price || 0) * (item?.quantity || 1)),
            comment: item?.comment,
            is_entrepreneur_defined: item?.is_entrepreneur_defined,
            is_optional: item?.is_optional,
          }))
        : [];
      
      // Parse milestone_adjustments from JSON - safely cast with flexible structure
      const rawMilestones = proposalRes.data?.milestone_adjustments;
      const milestoneAdjustments = Array.isArray(rawMilestones)
        ? rawMilestones.map((m: any) => ({
            description: m?.description || m?.trigger || '',
            percentage: m?.percentage ?? m?.entrepreneur_percentage ?? m?.consultant_percentage ?? 0,
            consultant_percentage: m?.consultant_percentage,
            entrepreneur_percentage: m?.entrepreneur_percentage,
            trigger: m?.trigger,
            is_entrepreneur_defined: m?.is_entrepreneur_defined,
          }))
        : [];

      // Fetch organization name from companies table if organization_id exists
      let organizationName = initiatorRes.data?.company_name;
      if (initiatorRes.data?.organization_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("name")
          .eq("id", initiatorRes.data.organization_id)
          .single();
        if (companyData?.name) {
          organizationName = companyData.name;
        }
      }

      return {
        ...session,
        proposal: proposalRes.data ? {
          id: proposalRes.data.id,
          price: proposalRes.data.price,
          supplier_name: proposalRes.data.supplier_name,
          current_version: proposalRes.data.current_version,
          advisor_id: proposalRes.data.advisor_id,
          fee_line_items: feeLineItems,
          milestone_adjustments: milestoneAdjustments,
          rfp_invite_id: proposalRes.data.rfp_invite_id,
        } : undefined,
        project: projectRes.data || undefined,
        advisor: advisorRes.data || undefined,
        initiator_profile: initiatorRes.data ? {
          name: initiatorRes.data.name,
          company_name: organizationName || initiatorRes.data.company_name,
          organization_id: initiatorRes.data.organization_id,
        } : undefined,
        line_item_negotiations: lineItemsRes.data || [],
        comments: commentsRes.data || [],
      } as NegotiationSessionWithDetails;
    } catch (error) {
      console.error("[useNegotiation] fetchNegotiationWithDetails error:", error);
      return null;
    }
  };

  const fetchActiveNegotiationsForProject = async (
    projectId: string
  ): Promise<NegotiationSession[]> => {
    try {
      const { data, error } = await supabase
        .from("negotiation_sessions")
        .select("*")
        .eq("project_id", projectId)
        .in("status", ["open", "awaiting_response", "responded"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as NegotiationSession[];
    } catch (error) {
      console.error(
        "[useNegotiation] fetchActiveNegotiationsForProject error:",
        error
      );
      return [];
    }
  };

  const rejectProposal = async (
    proposalId: string,
    rejectionReason?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("reject-proposal", {
        body: { proposal_id: proposalId, rejection_reason: rejectionReason },
      });

      if (error) throw error;

      toast({
        title: "הצעה נדחתה",
        description: "ההצעה נדחתה והיועץ קיבל הודעה",
      });

      return true;
    } catch (error: any) {
      console.error("[useNegotiation] rejectProposal error:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לדחות את ההצעה",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createNegotiationSession,
    respondToNegotiation,
    cancelNegotiation,
    fetchNegotiationByProposal,
    fetchNegotiationWithDetails,
    fetchActiveNegotiationsForProject,
    rejectProposal,
  };
};

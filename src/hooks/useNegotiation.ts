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

      // Check for 409 conflict (existing negotiation)
      if (result?.error === "ACTIVE_NEGOTIATION_EXISTS") {
        toast({
          title: "בקשה קיימת",
          description: "קיימת כבר בקשת עדכון פעילה להצעה זו",
        });
        return { existingSession: true, sessionId: result.existing_session_id };
      }

      if (error) throw error;

      toast({
        title: "בקשה נשלחה",
        description: "בקשת העדכון נשלחה ליועץ בהצלחה",
      });

      return result as NegotiationRequestOutput;
    } catch (error: any) {
      console.error("[useNegotiation] createNegotiationSession error:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לשלוח את הבקשה",
        variant: "destructive",
      });
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
        title: "הצעה מעודכנת נשלחה",
        description: "ההצעה המעודכנת נשלחה ליזם בהצלחה",
      });

      return result as NegotiationResponseOutput;
    } catch (error: any) {
      console.error("[useNegotiation] respondToNegotiation error:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לשלוח את ההצעה",
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
    proposalId: string
  ): Promise<NegotiationSession | null> => {
    try {
      const { data, error } = await supabase
        .from("negotiation_sessions")
        .select("*")
        .eq("proposal_id", proposalId)
        .in("status", ["open", "awaiting_response", "responded"])
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

      // Fetch related data
      const [proposalRes, projectRes, advisorRes, lineItemsRes, commentsRes] =
        await Promise.all([
          supabase
            .from("proposals")
            .select("id, price, supplier_name, current_version, advisor_id")
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
        ]);

      return {
        ...session,
        proposal: proposalRes.data,
        project: projectRes.data,
        advisor: advisorRes.data,
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

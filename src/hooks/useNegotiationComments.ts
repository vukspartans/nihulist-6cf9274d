import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NegotiationComment, CommentType } from "@/types/negotiation";

export const useNegotiationComments = (sessionId: string | null) => {
  const [comments, setComments] = useState<NegotiationComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchComments();
    }
  }, [sessionId]);

  const fetchComments = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("negotiation_comments")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      setComments((data || []) as NegotiationComment[]);
    } catch (err: any) {
      console.error("[useNegotiationComments] fetchComments error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (
    comment: Omit<NegotiationComment, "id" | "created_at">
  ): Promise<NegotiationComment | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from("negotiation_comments")
        .insert(comment)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchComments();
      return data as NegotiationComment;
    } catch (err: any) {
      console.error("[useNegotiationComments] addComment error:", err);
      setError(err.message);
      return null;
    }
  };

  const getCommentsByType = useCallback(
    (type: CommentType): NegotiationComment[] => {
      return comments.filter((c) => c.comment_type === type);
    },
    [comments]
  );

  const getCommentsByAuthor = useCallback(
    (authorType: "initiator" | "consultant"): NegotiationComment[] => {
      return comments.filter((c) => c.author_type === authorType);
    },
    [comments]
  );

  const getLatestCommentByType = useCallback(
    (type: CommentType): NegotiationComment | undefined => {
      const typeComments = getCommentsByType(type);
      return typeComments[typeComments.length - 1];
    },
    [getCommentsByType]
  );

  const commentTypeLabels: Record<CommentType, string> = {
    document: "מסמכים",
    scope: "היקף עבודה",
    milestone: "אבני דרך",
    payment: "תנאי תשלום",
    general: "כללי",
  };

  const commentTypeIcons: Record<CommentType, string> = {
    document: "📄",
    scope: "📋",
    milestone: "📅",
    payment: "💳",
    general: "💬",
  };

  return {
    comments,
    loading,
    error,
    fetchComments,
    addComment,
    getCommentsByType,
    getCommentsByAuthor,
    getLatestCommentByType,
    commentTypeLabels,
    commentTypeIcons,
  };
};

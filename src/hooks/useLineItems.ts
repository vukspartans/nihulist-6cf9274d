import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalLineItem } from "@/types/negotiation";

export const useLineItems = (
  proposalId: string | null,
  versionId?: string | null
) => {
  const [lineItems, setLineItems] = useState<ProposalLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (proposalId) {
      fetchLineItems();
    }
  }, [proposalId, versionId]);

  const fetchLineItems = async () => {
    if (!proposalId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("proposal_line_items")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("display_order", { ascending: true });

      if (versionId) {
        query = query.eq("proposal_version_id", versionId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setLineItems((data || []) as ProposalLineItem[]);
    } catch (err: any) {
      console.error("[useLineItems] fetchLineItems error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = useCallback(
    (items: ProposalLineItem[], includeOptional: boolean = false): number => {
      return items.reduce((sum, item) => {
        if (!includeOptional && item.is_optional) {
          return sum;
        }
        return sum + item.total;
      }, 0);
    },
    []
  );

  const calculateRequiredTotal = useCallback((): number => {
    return calculateTotal(lineItems, false);
  }, [lineItems, calculateTotal]);

  const calculateFullTotal = useCallback((): number => {
    return calculateTotal(lineItems, true);
  }, [lineItems, calculateTotal]);

  const getOptionalItems = useCallback((): ProposalLineItem[] => {
    return lineItems.filter((item) => item.is_optional);
  }, [lineItems]);

  const getRequiredItems = useCallback((): ProposalLineItem[] => {
    return lineItems.filter((item) => !item.is_optional);
  }, [lineItems]);

  const getItemsByCategory = useCallback((): Record<string, ProposalLineItem[]> => {
    return lineItems.reduce((acc, item) => {
      const category = item.category || "כללי";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, ProposalLineItem[]>);
  }, [lineItems]);

  const upsertLineItems = async (
    items: Partial<ProposalLineItem>[]
  ): Promise<boolean> => {
    try {
      const { error: upsertError } = await supabase
        .from("proposal_line_items")
        .upsert(items as any);

      if (upsertError) throw upsertError;

      await fetchLineItems();
      return true;
    } catch (err: any) {
      console.error("[useLineItems] upsertLineItems error:", err);
      setError(err.message);
      return false;
    }
  };

  const parseFromConditionsJson = (
    conditionsJson: Record<string, unknown> | null
  ): Partial<ProposalLineItem>[] => {
    if (!conditionsJson) return [];

    // Handle different structures
    const items: Partial<ProposalLineItem>[] = [];

    if (Array.isArray(conditionsJson)) {
      conditionsJson.forEach((item: any, index: number) => {
        items.push({
          name: item.name || item.title || `פריט ${index + 1}`,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || item.price || 0,
          total: item.total || item.unit_price || item.price || 0,
          is_optional: item.is_optional || item.optional || false,
          display_order: index,
        });
      });
    }

    return items;
  };

  return {
    lineItems,
    loading,
    error,
    fetchLineItems,
    calculateTotal,
    calculateRequiredTotal,
    calculateFullTotal,
    getOptionalItems,
    getRequiredItems,
    getItemsByCategory,
    upsertLineItems,
    parseFromConditionsJson,
  };
};

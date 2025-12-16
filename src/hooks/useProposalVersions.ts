import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalVersion } from "@/types/negotiation";

export const useProposalVersions = (proposalId: string | null) => {
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (proposalId) {
      fetchVersions();
    }
  }, [proposalId]);

  const fetchVersions = async () => {
    if (!proposalId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("proposal_versions")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("version_number", { ascending: false });

      if (fetchError) throw fetchError;

      setVersions((data || []) as unknown as ProposalVersion[]);
    } catch (err: any) {
      console.error("[useProposalVersions] fetchVersions error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getVersionById = (versionId: string): ProposalVersion | undefined => {
    return versions.find((v) => v.id === versionId);
  };

  const getLatestVersion = (): ProposalVersion | undefined => {
    return versions[0];
  };

  const compareVersions = (
    v1: ProposalVersion,
    v2: ProposalVersion
  ): {
    priceChange: number;
    priceChangePercent: number;
    timelineChange: number;
  } => {
    const priceChange = v2.price - v1.price;
    const priceChangePercent =
      v1.price > 0 ? Math.round((priceChange / v1.price) * 100) : 0;
    const timelineChange = v2.timeline_days - v1.timeline_days;

    return {
      priceChange,
      priceChangePercent,
      timelineChange,
    };
  };

  return {
    versions,
    loading,
    error,
    fetchVersions,
    getVersionById,
    getLatestVersion,
    compareVersions,
  };
};

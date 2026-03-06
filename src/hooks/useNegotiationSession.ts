import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNegotiation } from "@/hooks/useNegotiation";
import type { NegotiationSessionWithDetails, UpdatedLineItem, JsonLineItemAdjustment } from "@/types/negotiation";

interface ProjectFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface NegotiationFile {
  id?: string;
  name: string;
  url: string;
  size?: number;
  storagePath?: string;
}

export const useNegotiationSession = (sessionId: string) => {
  const [session, setSession] = useState<NegotiationSessionWithDetails | null>(null);
  const [updatedLineItems, setUpdatedLineItems] = useState<UpdatedLineItem[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [negotiationFiles, setNegotiationFiles] = useState<NegotiationFile[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const { fetchNegotiationWithDetails, respondToNegotiation, cancelNegotiation, loading } = useNegotiation();

  const loadNegotiationFiles = useCallback(async (sid: string): Promise<NegotiationFile[]> => {
    try {
      const { data: files, error } = await supabase
        .from('negotiation_files')
        .select('id, storage_path, original_name, file_size')
        .eq('session_id', sid);

      if (error || !files?.length) return [];

      // Batch all signed URL requests in parallel (N+1 fix)
      const signedUrlPromises = files.map(file => 
        supabase.storage.from('negotiation-files').createSignedUrl(file.storage_path, 3600)
      );
      const signedUrls = await Promise.all(signedUrlPromises);

      return files.map((file, idx) => ({
        id: file.id,
        name: file.original_name,
        url: signedUrls[idx]?.data?.signedUrl || '',
        size: file.file_size || 0,
        storagePath: file.storage_path,
      }));
    } catch (err) {
      console.error('Error loading negotiation files:', err);
      return [];
    }
  }, []);

  const loadProjectFiles = useCallback(async (proposalId: string): Promise<ProjectFile[]> => {
    try {
      const { data: proposal } = await supabase
        .from("proposals")
        .select("advisor_id, project_id")
        .eq("id", proposalId)
        .single();

      if (!proposal) return [];

      // Fetch RFP invite files and project files in parallel
      const [rfpResult, projectFilesResult] = await Promise.all([
        supabase
          .from("rfp_invites")
          .select("request_files, rfps!inner(project_id)")
          .eq("advisor_id", proposal.advisor_id)
          .eq("rfps.project_id", proposal.project_id)
          .maybeSingle(),
        supabase
          .from("project_files")
          .select("file_name, file_url, size_mb, file_type")
          .eq("project_id", proposal.project_id)
      ]);

      const allFiles: ProjectFile[] = [];

      // Parse RFP files
      if (rfpResult.data?.request_files) {
        const rawFiles = Array.isArray(rfpResult.data.request_files) 
          ? rfpResult.data.request_files 
          : [];
        const parsedFiles: ProjectFile[] = rawFiles
          .filter((f): f is { name: string; url: string; size?: number; type?: string } => 
            typeof f === 'object' && f !== null && 'name' in f && 'url' in f
          )
          .map(f => ({ name: String(f.name), url: String(f.url), size: f.size, type: f.type }));
        allFiles.push(...parsedFiles);
      }

      // Add project files
      if (projectFilesResult.data?.length) {
        const additionalFiles: ProjectFile[] = projectFilesResult.data.map((f) => ({
          name: f.file_name,
          url: f.file_url,
          size: f.size_mb ? f.size_mb * 1024 * 1024 : undefined,
          type: f.file_type,
        }));
        allFiles.push(...additionalFiles);
      }

      return allFiles;
    } catch (error) {
      console.error("Error loading project files:", error);
      return [];
    }
  }, []);

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    const data = await fetchNegotiationWithDetails(sessionId);
    setSession(data);
    
    // Initialize line items with target prices from JSON adjustments
    if (data) {
      const filesData = data.files as any;
      const jsonAdjustments: JsonLineItemAdjustment[] = filesData?.json_line_item_adjustments || [];
      
      if (jsonAdjustments.length > 0) {
        setUpdatedLineItems(
          jsonAdjustments.map((adj) => ({
            line_item_id: adj.line_item_id,
            consultant_response_price: adj.target_total ?? adj.adjustment_value ?? 0,
          }))
        );
      } else if (data.line_item_negotiations && data.line_item_negotiations.length > 0) {
        setUpdatedLineItems(
          data.line_item_negotiations.map((li) => ({
            line_item_id: li.line_item_id,
            consultant_response_price: li.initiator_target_price,
          }))
        );
      }
    }

    // Load all files in parallel
    if (data) {
      setLoadingFiles(true);
      const [projFiles, negFiles] = await Promise.all([
        data.proposal_id ? loadProjectFiles(data.proposal_id) : Promise.resolve([]),
        data.id ? loadNegotiationFiles(data.id) : Promise.resolve([])
      ]);
      setProjectFiles(projFiles);
      setNegotiationFiles(negFiles);
      setLoadingFiles(false);
    }

    setLoadingSession(false);
  }, [sessionId, fetchNegotiationWithDetails, loadProjectFiles, loadNegotiationFiles]);

  const handlePriceChange = useCallback((lineItemId: string, price: number) => {
    setUpdatedLineItems((prev) => {
      const existing = prev.find(item => item.line_item_id === lineItemId);
      if (existing) {
        return prev.map((item) =>
          item.line_item_id === lineItemId
            ? { ...item, consultant_response_price: price }
            : item
        );
      }
      return [...prev, { line_item_id: lineItemId, consultant_response_price: price }];
    });
  }, []);

  return {
    session,
    updatedLineItems,
    projectFiles,
    negotiationFiles,
    loadingSession,
    loadingFiles,
    loading,
    loadSession,
    handlePriceChange,
    respondToNegotiation,
    cancelNegotiation,
  };
};

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useNegotiationComments } from "@/hooks/useNegotiationComments";
import { supabase } from "@/integrations/supabase/client";
import type { NegotiationSessionWithDetails, UpdatedLineItem, FeeLineItem, JsonLineItemAdjustment } from "@/types/negotiation";
import { 
  RefreshCw, Send, ArrowLeft, ArrowRight, FileText, Download, Eye, Loader2, Check, XCircle, 
  AlertTriangle, Paperclip, Calendar, ArrowDown, ArrowUp, CheckCircle2,
  Building2, User, Clock, MessageSquare, ListChecks, FileCheck, LayoutList, Minus, Upload
} from "lucide-react";
import { getFeeUnitLabel } from "@/constants/rfpUnits";
import { Checkbox } from "@/components/ui/checkbox";
import { NegotiationPriceSummary } from "./NegotiationPriceSummary";
import { NegotiationItemsCard } from "./NegotiationItemsCard";
import { NegotiationFilesList } from "./NegotiationFilesList";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface NegotiationResponseViewProps {
  sessionId: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

interface ProjectFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface MilestoneAdjustment {
  description: string;
  entrepreneur_percentage: number;
  consultant_percentage?: number;
}

interface MilestoneResponse {
  description: string;
  originalPercentage: number;
  entrepreneurPercentage: number;
  advisorResponsePercentage: number;
  accepted: boolean;
}

interface NegotiationFile {
  id?: string;
  name: string;
  url: string;
  size?: number;
  storagePath?: string;
}

export const NegotiationResponseView = ({
  sessionId,
  onSuccess,
  onBack,
}: NegotiationResponseViewProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<NegotiationSessionWithDetails | null>(null);
  const [updatedLineItems, setUpdatedLineItems] = useState<UpdatedLineItem[]>([]);
  const [consultantMessage, setConsultantMessage] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [negotiationFiles, setNegotiationFiles] = useState<NegotiationFile[]>([]);
  const [embeddedFiles, setEmbeddedFiles] = useState<NegotiationFile[]>([]);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("overview");
  const [advisorUploadedFiles, setAdvisorUploadedFiles] = useState<UploadedFile[]>([]);
  const [milestoneResponses, setMilestoneResponses] = useState<MilestoneResponse[]>([]);

  const { fetchNegotiationWithDetails, respondToNegotiation, cancelNegotiation, loading } = useNegotiation();
  const { comments, commentTypeLabels, commentTypeIcons } = useNegotiationComments(sessionId);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoadingSession(true);
    const data = await fetchNegotiationWithDetails(sessionId);
    setSession(data);
    
    // Initialize line items - include ALL items with proper defaults
    if (data && data.proposal?.fee_line_items) {
      const filesData = data.files as any;
      const jsonAdjustments: JsonLineItemAdjustment[] = filesData?.json_line_item_adjustments || [];
      
      // Build a map of adjustments for quick lookup
      const adjustmentMap = new Map<string, JsonLineItemAdjustment>();
      jsonAdjustments.forEach((adj) => {
        adjustmentMap.set(adj.line_item_id, adj);
      });
      
      // Initialize ALL line items - not just those with adjustments
      const allLineItems = data.proposal.fee_line_items.map((item: any, idx: number) => {
        const itemId = item.item_id || `idx-${item.item_number ?? idx}`;
        const originalPrice = item.total || ((item.unit_price || 0) * (item.quantity || 1));
        
        // Check for adjustment using multiple ID formats
        const adjustment = adjustmentMap.get(itemId) || 
                          adjustmentMap.get(item.item_id) ||
                          adjustmentMap.get(`idx-${item.item_number ?? idx}`);
        
        // Default to original price unless there's an adjustment with a target value
        const defaultPrice = adjustment 
          ? (adjustment.target_total ?? adjustment.adjustment_value ?? originalPrice)
          : originalPrice;
        
        return {
          line_item_id: itemId,
          consultant_response_price: defaultPrice,
        };
      });
      
      setUpdatedLineItems(allLineItems);
      
      // Extract embedded files from session.files JSON
      if (filesData?.uploaded_files && Array.isArray(filesData.uploaded_files)) {
        const embedded = filesData.uploaded_files.map((f: any, idx: number) => ({
          id: `embedded-${idx}`,
          name: f.name || f.original_name || 'קובץ',
          url: f.url || f.storage_path || '',
          size: f.size || f.file_size || 0,
        }));
        setEmbeddedFiles(embedded);
      }
      
      // Initialize milestone responses from proposal milestones
      // Both consultant_percentage (original) and entrepreneur_percentage (requested) 
      // are stored in the SAME milestone object, not in separate arrays
      if (data.proposal?.milestone_adjustments) {
        const milestones = data.proposal.milestone_adjustments as any[];
        
        const responses: MilestoneResponse[] = milestones.map((milestone: any) => {
          // Original advisor percentage
          const originalPercentage = milestone.consultant_percentage ?? milestone.percentage ?? 0;
          // Entrepreneur's requested percentage (stored in same object)
          const entrepreneurPercentage = milestone.entrepreneur_percentage ?? originalPercentage;
          
          return {
            description: milestone.description || milestone.trigger || 'אבן דרך',
            originalPercentage: originalPercentage,
            entrepreneurPercentage: entrepreneurPercentage,
            advisorResponsePercentage: originalPercentage, // Default to original
            accepted: false,
          };
        });
        
        setMilestoneResponses(responses);
      }
    }

    // Load files in parallel
    if (data) {
      setLoadingFiles(true);
      await Promise.all([
        data.proposal_id ? loadProjectFiles(data.proposal_id) : Promise.resolve(),
        data.id ? loadNegotiationFiles(data.id) : Promise.resolve()
      ]);
      setLoadingFiles(false);
    }

    setLoadingSession(false);
  };

  const loadNegotiationFiles = async (sid: string) => {
    try {
      console.log('[NegotiationResponseView] Loading negotiation files for session:', sid);
      
      const { data: files, error } = await supabase
        .from('negotiation_files')
        .select('id, storage_path, original_name, file_size')
        .eq('session_id', sid);

      console.log('[NegotiationResponseView] Negotiation files query result:', { files, error });

      if (error) {
        console.error('Error loading negotiation files:', error);
        return;
      }

      if (files && files.length > 0) {
        // Batch all signed URL requests in parallel (N+1 fix)
        const signedUrlPromises = files.map(file => 
          supabase.storage.from('negotiation-files').createSignedUrl(file.storage_path, 3600)
        );
        const signedUrls = await Promise.all(signedUrlPromises);

        const filesWithUrls: NegotiationFile[] = files.map((file, idx) => ({
          id: file.id,
          name: file.original_name,
          url: signedUrls[idx]?.data?.signedUrl || '',
          size: file.file_size || 0,
          storagePath: file.storage_path,
        }));
        
        setNegotiationFiles(filesWithUrls);
      }
    } catch (err) {
      console.error('Error loading negotiation files:', err);
    }
  };

  const loadProjectFiles = async (proposalId: string) => {
    setLoadingFiles(true);
    try {
      const { data: proposal } = await supabase
        .from("proposals")
        .select("advisor_id, project_id")
        .eq("id", proposalId)
        .single();

      if (proposal) {
        const { data: rfpInvite } = await supabase
          .from("rfp_invites")
          .select("request_files, rfps!inner(project_id)")
          .eq("advisor_id", proposal.advisor_id)
          .eq("rfps.project_id", proposal.project_id)
          .maybeSingle();

        if (rfpInvite?.request_files) {
          const rawFiles = Array.isArray(rfpInvite.request_files) 
            ? rfpInvite.request_files 
            : [];
          const parsedFiles: ProjectFile[] = rawFiles
            .filter((f): f is { name: string; url: string; size?: number; type?: string } => 
              typeof f === 'object' && f !== null && 'name' in f && 'url' in f
            )
            .map(f => ({ name: String(f.name), url: String(f.url), size: f.size, type: f.type }));
          setProjectFiles(parsedFiles);
        }

        const { data: projectFilesData } = await supabase
          .from("project_files")
          .select("file_name, file_url, size_mb, file_type")
          .eq("project_id", proposal.project_id);

        if (projectFilesData && projectFilesData.length > 0) {
          const additionalFiles: ProjectFile[] = projectFilesData.map((f) => ({
            name: f.file_name,
            url: f.file_url,
            size: f.size_mb ? f.size_mb * 1024 * 1024 : undefined,
            type: f.file_type,
          }));
          setProjectFiles((prev) => [...prev, ...additionalFiles]);
        }
      }
    } catch (error) {
      console.error("Error loading project files:", error);
    }
    setLoadingFiles(false);
  };

  const handleViewFile = async (file: ProjectFile | NegotiationFile) => {
    try {
      if (file.url.includes("supabase")) {
        const pathMatch = file.url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
        if (pathMatch) {
          const [, bucket, path] = pathMatch;
          const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
          if (data?.signedUrl) {
            window.open(data.signedUrl, "_blank");
            return;
          }
        }
      }
      window.open(file.url, "_blank");
    } catch {
      window.open(file.url, "_blank");
    }
  };

  const handleDownloadFile = async (file: ProjectFile | NegotiationFile) => {
    try {
      let url = file.url;
      
      if (file.url.includes("supabase")) {
        const pathMatch = file.url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
        if (pathMatch) {
          const [, bucket, path] = pathMatch;
          const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
          if (data?.signedUrl) {
            url = data.signedUrl;
          }
        }
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      window.open(file.url, "_blank");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Parse JSON line item adjustments from session.files
  const jsonAdjustments = useMemo((): JsonLineItemAdjustment[] => {
    const filesData = session?.files as any;
    return filesData?.json_line_item_adjustments || [];
  }, [session?.files]);

  // Get original fee line items from proposal
  const feeLineItems = useMemo((): FeeLineItem[] => {
    return session?.proposal?.fee_line_items || [];
  }, [session?.proposal?.fee_line_items]);

  // Get item ID helper
  const getItemId = (item: FeeLineItem, index: number): string => {
    return item.item_id || `idx-${item.item_number ?? index}`;
  };

  // Find adjustment for a given item - check multiple ID formats
  const getAdjustmentForItem = (item: FeeLineItem, index: number): JsonLineItemAdjustment | undefined => {
    const itemId = getItemId(item, index);
    // Try to find by item_id, then by description match as fallback
    return jsonAdjustments.find(adj => 
      adj.line_item_id === itemId || 
      adj.line_item_id === item.item_id ||
      adj.line_item_id === `idx-${item.item_number ?? index}`
    );
  };

  // Get original price for an item (with fallback calculation)
  const getOriginalPrice = (item: FeeLineItem, adjustment?: JsonLineItemAdjustment): number => {
    if (adjustment?.original_total) return adjustment.original_total;
    if (item.total) return item.total;
    return (item.unit_price || 0) * (item.quantity || 1);
  };

  // Get target price from adjustment - handle both formats
  const getTargetPrice = (originalPrice: number, adjustment?: JsonLineItemAdjustment): number => {
    if (!adjustment) return originalPrice;
    // First check target_total (direct value)
    if (adjustment.target_total !== undefined) return adjustment.target_total;
    // Then check adjustment_value which could be the target price
    if (adjustment.adjustment_value !== undefined) return adjustment.adjustment_value;
    // Fallback to original
    return originalPrice;
  };

  // Calculate totals
  const originalTotal = session?.proposal?.price || 0;
  
  // Recalculate target total from adjustments (don't trust stored value which may be incorrect)
  const targetTotal = useMemo(() => {
    if (!feeLineItems.length) return session?.target_total || 0;
    
    let total = 0;
    feeLineItems.forEach((item, idx) => {
      const itemId = getItemId(item, idx);
      const originalPrice = item.total || ((item.unit_price || 0) * (item.quantity || 1));
      
      // Find adjustment for this item
      const adjustment = jsonAdjustments.find(adj => 
        adj.line_item_id === itemId || 
        adj.line_item_id === item.item_id ||
        adj.line_item_id === `idx-${item.item_number ?? idx}`
      );
      
      if (adjustment) {
        // Use adjustment target value (could be target_total or adjustment_value)
        total += adjustment.target_total ?? adjustment.adjustment_value ?? 0;
      } else {
        // No adjustment = unchanged, add original price
        total += originalPrice;
      }
    });
    
    return total;
  }, [feeLineItems, jsonAdjustments, session?.target_total]);
  
  // Calculate newTotal from ALL line items (fixed calculation)
  const newTotal = useMemo(() => {
    if (!feeLineItems.length) return targetTotal;
    
    let total = 0;
    feeLineItems.forEach((item, idx) => {
      const itemId = getItemId(item, idx);
      const originalPrice = item.total || ((item.unit_price || 0) * (item.quantity || 1));
      
      // Check if vendor has made a custom response
      const vendorResponse = updatedLineItems.find(u => u.line_item_id === itemId);
      
      if (vendorResponse !== undefined) {
        // Use vendor's proposed price
        total += vendorResponse.consultant_response_price || 0;
      } else {
        // No vendor change - use original price
        total += originalPrice;
      }
    });
    
    return total;
  }, [feeLineItems, updatedLineItems, targetTotal]);

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

  const handleApprovalChange = useCallback((itemId: string, approved: boolean, targetPrice: number) => {
    setApprovedItems((prev) => {
      const newSet = new Set(prev);
      if (approved) {
        newSet.add(itemId);
        handlePriceChange(itemId, targetPrice);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, [handlePriceChange]);

  const handleSubmit = async () => {
    const result = await respondToNegotiation({
      session_id: sessionId,
      consultant_message: consultantMessage || undefined,
      updated_line_items: updatedLineItems.length > 0 ? updatedLineItems : [],
      milestone_responses: milestoneResponses.length > 0 ? milestoneResponses : undefined,
      uploaded_files: advisorUploadedFiles.length > 0 ? advisorUploadedFiles : undefined,
    });

    if (result) {
      onSuccess?.();
    }
  };

  const handleAcceptTarget = async () => {
    setShowAcceptDialog(false);
    
    // Set all line items to entrepreneur's target prices
    const acceptedItems = jsonAdjustments.map(adj => ({
      line_item_id: adj.line_item_id,
      consultant_response_price: adj.target_total ?? adj.adjustment_value ?? 0
    }));

    // Accept all milestone changes
    const acceptedMilestones = milestoneResponses.map(m => ({
      ...m,
      advisorResponsePercentage: m.entrepreneurPercentage,
      accepted: true
    }));

    const result = await respondToNegotiation({
      session_id: sessionId,
      consultant_message: consultantMessage || "אני מקבל/ת את המחיר המבוקש",
      updated_line_items: acceptedItems.length > 0 ? acceptedItems : [],
      milestone_responses: acceptedMilestones.length > 0 ? acceptedMilestones : undefined,
      uploaded_files: advisorUploadedFiles.length > 0 ? advisorUploadedFiles : undefined,
    });

    if (result) {
      onSuccess?.();
    }
  };

  const handleCounterOffer = () => {
    // Get RFP invite ID from proposal
    const rfpInviteId = session?.proposal?.rfp_invite_id;
    
    // Store negotiation context in sessionStorage for pre-filling
    sessionStorage.setItem('negotiation_context', JSON.stringify({
      sessionId: sessionId,
      proposalId: session?.proposal_id,
      originalPrice: originalTotal,
      targetPrice: targetTotal,
      updatedLineItems: updatedLineItems,
      consultantMessage: consultantMessage,
      milestoneResponses: milestoneResponses,
      advisorUploadedFiles: advisorUploadedFiles,
      isCounterOffer: true,
    }));
    
    // Navigate to advisor dashboard with counter-offer context
    navigate(`/advisor-dashboard?counter_offer=${sessionId}`);
  };

  // Milestone response handlers
  const handleMilestoneAccept = (description: string) => {
    setMilestoneResponses(prev => prev.map(m => {
      if (m.description === description) {
        return {
          ...m,
          accepted: true,
          advisorResponsePercentage: m.entrepreneurPercentage
        };
      }
      return m;
    }));
  };

  const handleMilestonePercentageChange = (description: string, percentage: number) => {
    setMilestoneResponses(prev => prev.map(m => {
      if (m.description === description) {
        return {
          ...m,
          advisorResponsePercentage: percentage,
          accepted: false // If custom value, not "accepted"
        };
      }
      return m;
    }));
  };

  const milestoneResponseTotal = useMemo(() => {
    return milestoneResponses.reduce((sum, m) => sum + m.advisorResponsePercentage, 0);
  }, [milestoneResponses]);

  const isMilestoneResponseValid = milestoneResponseTotal === 100;

  const handleDecline = async () => {
    setDeclining(true);
    const success = await cancelNegotiation(sessionId);
    setDeclining(false);
    setShowDeclineDialog(false);
    
    if (success) {
      onSuccess?.();
    }
  };

  const calculateReductionPercent = () => {
    if (!originalTotal || originalTotal === 0) return 0;
    return Math.round(((originalTotal - targetTotal) / originalTotal) * 100);
  };

  const calculateNewReductionPercent = () => {
    if (!originalTotal || originalTotal === 0) return 0;
    return Math.round(((originalTotal - newTotal) / originalTotal) * 100);
  };

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">לא נמצא משא ומתן פעיל</p>
      </div>
    );
  }

  const canRespond = session.status === "awaiting_response";
  const isAlreadyResponded = session.status === "responded";
  const isCancelled = session.status === "cancelled";
  const isResolved = session.status === "resolved";

  // Get requester info - prioritize organization name
  const requesterOrg = session.initiator_profile?.company_name;
  const requesterName = session.initiator_profile?.name || "יזם";
  const displayName = requesterOrg || requesterName;
  const requestDate = session.created_at ? format(new Date(session.created_at), "d בMMMM yyyy, HH:mm", { locale: he }) : "";

  // Get milestone adjustments from session
  const milestoneAdjustments = (session.milestone_adjustments as MilestoneAdjustment[]) || [];

  // Count items with changes - handle both data formats
  const itemsWithChanges = jsonAdjustments.filter(adj => {
    const origTotal = adj.original_total ?? 0;
    const targTotal = adj.target_total ?? adj.adjustment_value ?? origTotal;
    return origTotal !== targTotal;
  }).length;
  const removedItems = jsonAdjustments.filter(adj => 
    (adj.target_total ?? adj.adjustment_value) === 0
  ).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with Requester Info */}
      <Card className="bg-gradient-to-l from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-blue-900">בקשת עדכון הצעה</h2>
                <div className="flex items-center gap-2 mt-1 text-blue-700 flex-wrap">
                  <span className="font-semibold text-lg">{displayName}</span>
                  {requesterOrg && requesterName && requesterOrg !== requesterName && (
                    <>
                      <span className="text-blue-400">•</span>
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        <span className="text-sm">{requesterName}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-blue-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>נשלח ב-{requestDate}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2">
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-white">
                פרויקט: {session.project?.name}
              </Badge>
{onBack && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack} 
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לדשבורד
          </Button>
        )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Banner for non-respondable sessions */}
      {!canRespond && (
        <Card className={
          isAlreadyResponded 
            ? "bg-green-50 border-green-200" 
            : isCancelled 
              ? "bg-gray-50 border-gray-200" 
              : "bg-amber-50 border-amber-200"
        }>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              {isAlreadyResponded ? (
                <>
                  <Send className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">ההצעה כבר נשלחה</p>
                    <p className="text-sm text-green-700">כבר שלחת תגובה לבקשה זו. ההצעה המעודכנת נמצאת בבדיקת היזם.</p>
                  </div>
                </>
              ) : isCancelled ? (
                <>
                  <XCircle className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800">המשא ומתן בוטל</p>
                    <p className="text-sm text-gray-700">בקשת המשא ומתן בוטלה ולא ניתן להגיב עליה.</p>
                  </div>
                </>
              ) : isResolved ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">המשא ומתן הסתיים</p>
                    <p className="text-sm text-amber-700">המשא ומתן הסתיים ולא ניתן להגיב עליו עוד.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">לא ניתן להגיב כעת</p>
                    <p className="text-sm text-amber-700">סטטוס המשא ומתן הנוכחי: {session.status}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        {/* Mobile: Horizontal scrollable tabs */}
        <ScrollArea className="w-full sm:hidden">
          <TabsList className="flex w-max h-auto p-1 gap-1">
            <TabsTrigger value="overview" className="text-xs py-2 px-3 flex-row-reverse gap-1 whitespace-nowrap">
              סקירה
            </TabsTrigger>
            <TabsTrigger value="items" className="text-xs py-2 px-3 flex-row-reverse gap-1 whitespace-nowrap">
              פריטים
              {itemsWithChanges > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {itemsWithChanges}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="milestones" className="text-xs py-2 px-3 flex-row-reverse gap-1 whitespace-nowrap">
              אבני דרך
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs py-2 px-3 flex-row-reverse gap-1 whitespace-nowrap">
              קבצים
            </TabsTrigger>
            <TabsTrigger value="response" className="text-xs py-2 px-3 flex-row-reverse gap-1 whitespace-nowrap">
              תגובה
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
        {/* Desktop: Grid tabs */}
        <TabsList className="hidden sm:grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="overview" className="text-sm py-2 flex-row-reverse gap-1.5">
            <LayoutList className="h-4 w-4" />
            סקירה
          </TabsTrigger>
          <TabsTrigger value="items" className="text-sm py-2 flex-row-reverse gap-1.5">
            <ListChecks className="h-4 w-4" />
            פריטים
            {itemsWithChanges > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {itemsWithChanges}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="milestones" className="text-sm py-2 flex-row-reverse gap-1.5">
            <Calendar className="h-4 w-4" />
            אבני דרך
          </TabsTrigger>
          <TabsTrigger value="files" className="text-sm py-2 flex-row-reverse gap-1.5">
            <Paperclip className="h-4 w-4" />
            קבצים
          </TabsTrigger>
          <TabsTrigger value="response" className="text-sm py-2 flex-row-reverse gap-1.5">
            <FileCheck className="h-4 w-4" />
            תגובה
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Price Comparison Card */}
          <Card className="bg-gradient-to-l from-amber-50 to-orange-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 flex-row-reverse justify-end">
                <LayoutList className="h-5 w-5 text-amber-600" />
                סיכום בקשת העדכון
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Price comparison - responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="p-3 sm:p-4 bg-white/60 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">מחיר מקורי</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(originalTotal)}</p>
                </div>
                <div className="p-3 sm:p-4 bg-amber-100/60 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700 mb-1">מחיר יעד מבוקש</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-700">{formatCurrency(targetTotal)}</p>
                  <Badge variant="outline" className="mt-1 text-xs border-amber-400 text-amber-700">
                    <span dir="ltr">
                      {calculateReductionPercent() > 0 ? `-${calculateReductionPercent()}%` : 'ללא שינוי'}
                    </span>
                  </Badge>
                </div>
                <div className="p-3 sm:p-4 bg-white/60 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">הפרש מבוקש</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">
                    {formatCurrency(originalTotal - targetTotal)}
                  </p>
                </div>
              </div>

              {/* Summary Stats - responsive grid */}
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 text-center">
                <div className="p-1.5 sm:p-2 bg-white/50 rounded">
                  <p className="text-base sm:text-lg font-bold text-foreground">{feeLineItems.length}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">פריטים בהצעה</p>
                </div>
                <div className="p-1.5 sm:p-2 bg-amber-50 rounded">
                  <p className="text-base sm:text-lg font-bold text-amber-700">{itemsWithChanges}</p>
                  <p className="text-[10px] sm:text-xs text-amber-600">פריטים לעדכון</p>
                </div>
                <div className="p-1.5 sm:p-2 bg-red-50 rounded">
                  <p className="text-base sm:text-lg font-bold text-red-600">{removedItems}</p>
                  <p className="text-[10px] sm:text-xs text-red-500">פריטים להסרה</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Global Comment / Initiator Message */}
          {(session.global_comment || session.initiator_message) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  הודעה מהיזם
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-800 whitespace-pre-wrap">
                    {session.initiator_message || session.global_comment}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Initiator Comments */}
          {comments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">הערות נוספות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border"
                  >
                    <span className="text-lg">
                      {commentTypeIcons[comment.comment_type]}
                    </span>
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">
                        {commentTypeLabels[comment.comment_type]}
                      </p>
                      <p className="text-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between flex-row-reverse">
                <div className="flex items-center gap-2 flex-row-reverse">
                  <ListChecks className="h-5 w-5" />
                  פירוט פריטים ({feeLineItems.length})
                </div>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  {itemsWithChanges} עדכונים מבוקשים
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feeLineItems.length > 0 ? (
                <>
                  {/* Mobile: Card view */}
                  <div className="sm:hidden space-y-3" dir="rtl">
                    {feeLineItems.map((item, index) => {
                      const itemId = getItemId(item, index);
                      const adjustment = getAdjustmentForItem(item, index);
                      const originalPrice = getOriginalPrice(item, adjustment);
                      const targetPrice = getTargetPrice(originalPrice, adjustment);
                      const hasChange = adjustment !== undefined && originalPrice !== targetPrice;
                      const isRemoved = targetPrice === 0;
                      const changePercent = originalPrice > 0 
                        ? Math.round(((originalPrice - targetPrice) / originalPrice) * 100) 
                        : 0;
                      
                      const currentResponse = updatedLineItems.find(u => u.line_item_id === itemId);
                      const isApproved = approvedItems.has(itemId);

                      return (
                        <NegotiationItemsCard
                          key={itemId}
                          item={item}
                          index={index}
                          itemId={itemId}
                          adjustment={adjustment}
                          originalPrice={originalPrice}
                          targetPrice={targetPrice}
                          hasChange={hasChange}
                          isRemoved={isRemoved}
                          changePercent={changePercent}
                          currentResponse={currentResponse}
                          isApproved={isApproved}
                          canRespond={canRespond}
                          formatCurrency={formatCurrency}
                          onPriceChange={handlePriceChange}
                          onApprovalChange={handleApprovalChange}
                        />
                      );
                    })}
                    
                    {/* Mobile Summary Footer */}
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">מקורי</p>
                            <p className="font-bold">{formatCurrency(originalTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-amber-700">יעד</p>
                            <p className="font-bold text-amber-700">{formatCurrency(targetTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-green-700">הצעה</p>
                            <p className="font-bold text-green-700">{formatCurrency(newTotal)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Desktop: Table view */}
                  <div className="hidden sm:block overflow-x-auto" dir="rtl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right min-w-[200px] font-semibold">תיאור</TableHead>
                          <TableHead className="text-center w-20 font-semibold">יחידה</TableHead>
                          <TableHead className="text-center w-20 font-semibold">כמות</TableHead>
                          <TableHead className="text-center w-28 font-semibold">מקורי</TableHead>
                          <TableHead className="text-center w-28 font-semibold">יעד</TableHead>
                          <TableHead className="text-center w-24 font-semibold">שינוי</TableHead>
                          <TableHead className="text-center w-32 font-semibold">הצעה חדשה</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeLineItems.map((item, index) => {
                          const itemId = getItemId(item, index);
                          const adjustment = getAdjustmentForItem(item, index);
                          const originalPrice = getOriginalPrice(item, adjustment);
                          const targetPrice = getTargetPrice(originalPrice, adjustment);
                          const hasChange = adjustment !== undefined && originalPrice !== targetPrice;
                          const isRemoved = targetPrice === 0;
                          const changePercent = originalPrice > 0 
                            ? Math.round(((originalPrice - targetPrice) / originalPrice) * 100) 
                            : 0;
                          
                          const currentResponse = updatedLineItems.find(u => u.line_item_id === itemId);
                          const isApproved = approvedItems.has(itemId);

                          return (
                            <TableRow 
                              key={itemId}
                              className={isRemoved ? "bg-red-50/50" : hasChange ? "bg-amber-50/30" : ""}
                            >
                              <TableCell className="text-right">
                                <div>
                                  <p className={`font-medium ${isRemoved ? "line-through text-muted-foreground" : ""}`}>
                                    {item.description}
                                  </p>
                                  {adjustment?.initiator_note && (
                                    <p className="text-xs text-amber-700 mt-1 bg-amber-100 px-2 py-1 rounded">
                                      💬 {adjustment.initiator_note}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {getFeeUnitLabel(item.unit || '') || '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {adjustment?.quantity ?? item.quantity ?? 1}
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {formatCurrency(originalPrice)}
                              </TableCell>
                              <TableCell className="text-center">
                                {isRemoved ? (
                                  <Badge variant="destructive" className="text-xs">הוסר</Badge>
                                ) : (
                                  <span className={hasChange ? "font-bold text-amber-700" : ""}>
                                    {formatCurrency(targetPrice)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {hasChange ? (
                                  <Badge 
                                    variant="outline" 
                                    className={isRemoved ? "border-red-300 text-red-600 bg-red-50" : "border-amber-300 text-amber-700 bg-amber-50"}
                                  >
                                    <span dir="ltr">-{changePercent}%</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-muted text-muted-foreground bg-muted/30">
                                    <Minus className="h-3 w-3" />
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isRemoved ? (
                                  <span className="text-xs text-muted-foreground">-</span>
                                ) : isApproved ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge className="bg-green-100 text-green-700 border-green-300 gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      אושר
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-6"
                                      onClick={() => handleApprovalChange(itemId, false, targetPrice)}
                                      disabled={!canRespond}
                                    >
                                      בטל
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      type="number"
                                      value={currentResponse?.consultant_response_price ?? targetPrice}
                                      onChange={(e) => handlePriceChange(itemId, parseFloat(e.target.value) || 0)}
                                      className="w-24 h-8 text-center text-sm"
                                      disabled={!canRespond}
                                    />
                                    {hasChange && (
                                      <Checkbox
                                        checked={false}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            handleApprovalChange(itemId, true, targetPrice);
                                          }
                                        }}
                                        disabled={!canRespond}
                                        className="h-4 w-4"
                                        title="אשר מחיר יעד"
                                      />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="text-right font-bold">סה״כ</TableCell>
                          <TableCell className="text-center font-bold">{formatCurrency(originalTotal)}</TableCell>
                          <TableCell className="text-center font-bold text-amber-700">{formatCurrency(targetTotal)}</TableCell>
                          <TableCell className="text-center">
                            {targetTotal !== originalTotal ? (
                              <Badge variant="outline" className="border-red-300 text-red-600">
                                <span dir="ltr">-{calculateReductionPercent()}%</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-muted text-muted-foreground">—</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {newTotal !== originalTotal ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-green-700">{formatCurrency(newTotal)}</span>
                                <Badge variant="outline" className="border-green-300 text-green-600 text-xs mt-1">
                                  <span dir="ltr">{calculateNewReductionPercent() > 0 ? `-${calculateNewReductionPercent()}%` : 'ללא שינוי'}</span>
                                </Badge>
                              </div>
                            ) : (
                              <span className="font-bold text-green-700">{formatCurrency(newTotal)}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-muted-foreground bg-muted/30 rounded-lg">
                  <p>הצעה זו אינה כוללת פירוט פריטים</p>
                  <p className="text-sm mt-1">היזם מבקש הנחה כוללת על סך ההצעה</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                תנאי תשלום - השוואה
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestoneResponses.length > 0 ? (
                <div className="space-y-4">
                  {/* Comparison Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right font-semibold">אבן דרך</TableHead>
                          <TableHead className="text-center font-semibold">
                            <div className="flex items-center justify-center gap-1">
                              <User className="h-4 w-4" />
                              יועץ (מקורי)
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold">
                            <div className="flex items-center justify-center gap-1">
                              <Building2 className="h-4 w-4" />
                              יזם (מבוקש)
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold">שינוי</TableHead>
                          {canRespond && (
                            <TableHead className="text-center font-semibold bg-green-50">
                              <div className="flex items-center justify-center gap-1 text-green-700">
                                <Check className="h-4 w-4" />
                                התגובה שלך
                              </div>
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestoneResponses.map((milestone, idx) => {
                          const hasChange = milestone.originalPercentage !== milestone.entrepreneurPercentage;
                          const changeAmount = milestone.entrepreneurPercentage - milestone.originalPercentage;
                          
                          return (
                            <TableRow key={idx} className={hasChange ? "bg-amber-50/30" : ""}>
                              <TableCell className="font-medium">
                                {milestone.description}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{milestone.originalPercentage}%</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  variant="outline" 
                                  className={hasChange ? "border-amber-400 text-amber-700 bg-amber-100" : ""}
                                >
                                  {milestone.entrepreneurPercentage}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {hasChange ? (
                                  <div className="flex items-center justify-center gap-1">
                                    {changeAmount > 0 ? (
                                      <ArrowUp className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <ArrowDown className="h-4 w-4 text-red-600" />
                                    )}
                                    <span className={changeAmount > 0 ? "text-green-600" : "text-red-600"} dir="ltr">
                                      {changeAmount > 0 ? '+' : ''}{changeAmount}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              {canRespond && (
                                <TableCell className="text-center bg-green-50/30">
                                  <div className="flex items-center justify-center gap-2">
                                    {hasChange && (
                                      <Button
                                        size="sm"
                                        variant={milestone.accepted ? "default" : "outline"}
                                        className={milestone.accepted ? "bg-green-600 hover:bg-green-700 h-7 px-2" : "h-7 px-2 border-green-300 text-green-700 hover:bg-green-100"}
                                        onClick={() => handleMilestoneAccept(milestone.description)}
                                        title="אשר הצעת יזם"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      className="w-16 h-7 text-center text-sm"
                                      value={milestone.advisorResponsePercentage}
                                      onChange={(e) => handleMilestonePercentageChange(milestone.description, parseInt(e.target.value) || 0)}
                                    />
                                    <span className="text-sm text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-bold">
                          <TableCell className="text-right">סה״כ</TableCell>
                          <TableCell className="text-center">
                            {milestoneResponses.reduce((sum, m) => sum + m.originalPercentage, 0)}%
                          </TableCell>
                          <TableCell className="text-center">
                            {milestoneResponses.reduce((sum, m) => sum + m.entrepreneurPercentage, 0)}%
                          </TableCell>
                          <TableCell></TableCell>
                          {canRespond && (
                            <TableCell className={`text-center ${isMilestoneResponseValid ? 'bg-green-100' : 'bg-red-100'}`}>
                              <Badge 
                                variant="outline" 
                                className={isMilestoneResponseValid 
                                  ? "border-green-400 text-green-700 bg-green-100" 
                                  : "border-red-400 text-red-700 bg-red-100"
                                }
                              >
                                {milestoneResponseTotal}%
                                {isMilestoneResponseValid ? (
                                  <CheckCircle2 className="h-3 w-3 ms-1" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 ms-1" />
                                )}
                              </Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                  
                  {/* Validation Alert */}
                  {canRespond && !isMilestoneResponseValid && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        סה״כ אחוזי אבני הדרך חייב להיות 100%. כרגע: {milestoneResponseTotal}%
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : session.proposal?.milestone_adjustments && session.proposal.milestone_adjustments.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    אבני דרך מוגדרות:
                  </p>
                  <div className="space-y-2">
                    {session.proposal.milestone_adjustments.map((m, idx) => {
                      const displayPercentage = m.percentage ?? m.consultant_percentage ?? m.entrepreneur_percentage ?? 0;
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                          <span className="font-medium">{m.description || m.trigger || `אבן דרך ${idx + 1}`}</span>
                          <Badge variant="secondary">{displayPercentage}%</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground bg-muted/30 rounded-lg">
                  <p>לא הוגדרו אבני דרך להצעה זו</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4 mt-4">
          {/* Negotiation Files from database */}
          {negotiationFiles.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                  <Paperclip className="h-5 w-5" />
                  קבצים שצורפו לבקשה ({negotiationFiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {negotiationFiles.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        {file.size && file.size > 0 && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-700 hover:bg-amber-100"
                          onClick={() => handleViewFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-700 hover:bg-amber-100"
                          onClick={() => handleDownloadFile(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Embedded files from session.files JSON */}
          {embeddedFiles.length > 0 && negotiationFiles.length === 0 && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                  <Paperclip className="h-5 w-5" />
                  קבצים שצורפו לבקשה ({embeddedFiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {embeddedFiles.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        {file.size && file.size > 0 && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-700 hover:bg-amber-100"
                          onClick={() => handleViewFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-700 hover:bg-amber-100"
                          onClick={() => handleDownloadFile(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Files */}
          {(projectFiles.length > 0 || loadingFiles) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  קבצי הפרויקט ({projectFiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    טוען קבצים...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{file.name}</span>
                          {file.size && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewFile(file)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownloadFile(file)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {negotiationFiles.length === 0 && embeddedFiles.length === 0 && projectFiles.length === 0 && !loadingFiles && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>לא צורפו קבצים לבקשה זו</p>
                {canRespond && (
                  <p className="text-sm mt-1">באפשרותך להוסיף קבצים לתגובה שלך למטה</p>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Advisor File Upload Section */}
          {canRespond && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-green-800">
                  <Upload className="h-5 w-5" />
                  הוסף קבצים לתגובה שלך
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  maxFiles={5}
                  maxSize={10 * 1024 * 1024}
                  onUpload={setAdvisorUploadedFiles}
                  advisorId={session?.proposal?.advisor_id}
                  existingFiles={advisorUploadedFiles}
                />
                {advisorUploadedFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {advisorUploadedFiles.length} קבצים יצורפו לתגובה שלך
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Response Tab */}
        <TabsContent value="response" className="space-y-4 mt-4">
          {/* Summary of Your Offer */}
          <Card className="bg-green-50/50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                <FileCheck className="h-5 w-5" />
                סיכום ההצעה שלך
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">מחיר מקורי</p>
                  <p className="text-lg font-bold">{formatCurrency(originalTotal)}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <p className="text-xs text-amber-700 mb-1">יעד היזם</p>
                  <p className="text-lg font-bold text-amber-700">{formatCurrency(targetTotal)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 mb-1">ההצעה שלך</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(newTotal)}</p>
                  <Badge variant="outline" className="mt-1 text-xs border-green-400 text-green-700">
                    <span dir="ltr">
                      {calculateNewReductionPercent() > 0 ? `-${calculateNewReductionPercent()}%` : 'ללא הנחה'}
                    </span>
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestone Response Summary */}
          {milestoneResponses.length > 0 && (
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <Calendar className="h-5 w-5" />
                  שינויים באבני דרך
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {milestoneResponses.map((m, idx) => {
                    const changedFromOriginal = m.advisorResponsePercentage !== m.originalPercentage;
                    const acceptedEntrepreneur = m.advisorResponsePercentage === m.entrepreneurPercentage && m.entrepreneurPercentage !== m.originalPercentage;
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          acceptedEntrepreneur 
                            ? 'bg-green-100 border border-green-200' 
                            : changedFromOriginal 
                              ? 'bg-amber-50 border border-amber-200' 
                              : 'bg-muted/30'
                        }`}
                      >
                        <span className="text-sm font-medium">{m.description}</span>
                        <div className="flex items-center gap-2">
                          {changedFromOriginal && (
                            <span className="text-xs text-muted-foreground line-through">{m.originalPercentage}%</span>
                          )}
                          <Badge 
                            variant={changedFromOriginal ? "default" : "secondary"}
                            className={acceptedEntrepreneur ? "bg-green-600" : ""}
                          >
                            {m.advisorResponsePercentage}%
                          </Badge>
                          {acceptedEntrepreneur && (
                            <Check className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!isMilestoneResponseValid && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      סה״כ אבני דרך חייב להיות 100% (כרגע: {milestoneResponseTotal}%)
                    </AlertDescription>
                  </Alert>
                )}
                {isMilestoneResponseValid && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>סה״כ: 100%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Response Message */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">הודעה ליזם (אופציונלי)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="הוסף הערות או הסברים להצעה המעודכנת..."
                value={consultantMessage}
                onChange={(e) => setConsultantMessage(e.target.value)}
                className="min-h-[100px]"
                disabled={!canRespond}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          {canRespond && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeclineDialog(true)} 
                    disabled={loading || declining}
                  >
                    <XCircle className="h-4 w-4 me-2" />
                    דחה בקשה
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAcceptDialog(true)} 
                    disabled={loading || declining}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4 me-2" />
                    קבל מחיר יעד
                  </Button>
                  <Button 
                    onClick={handleCounterOffer} 
                    disabled={loading || declining}
                    className="bg-primary"
                  >
                    <Send className="h-4 w-4 me-2" />
                    שלח הצעה נגדית
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>דחיית בקשת משא ומתן</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לדחות את בקשת המשא ומתן? היזם יקבל הודעה על הדחייה וההצעה המקורית תישאר זמינה לקבלה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="סיבת דחייה (אופציונלי)..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDecline}
              disabled={declining}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {declining ? "דוחה..." : "דחה בקשה"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accept Target Price Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              אישור קבלת מחיר יעד
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-3">
              <p>
                אתה עומד לאשר את מחיר היעד שהוצע על ידי היזם:
              </p>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <p className="text-sm text-muted-foreground">מחיר יעד מבוקש</p>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(targetTotal)}</p>
                {calculateReductionPercent() > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    (הפחתה של {calculateReductionPercent()}% מהמחיר המקורי)
                  </p>
                )}
              </div>
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>שים לב:</strong> זוהי הצעה מחייבת בהתאם לתנאי השימוש של המערכת. 
                  לאחר האישור, היזם יקבל הודעה והמחיר המעודכן ייכנס לתוקף.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAcceptTarget}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 me-2" />
              אשר והתחייב
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

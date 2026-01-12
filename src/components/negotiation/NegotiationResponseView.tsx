import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useNegotiationComments } from "@/hooks/useNegotiationComments";
import { supabase } from "@/integrations/supabase/client";
import type { NegotiationSessionWithDetails, UpdatedLineItem, FeeLineItem, JsonLineItemAdjustment } from "@/types/negotiation";
import { 
  RefreshCw, Send, ArrowLeft, FileText, Download, Eye, Loader2, Check, XCircle, 
  TrendingDown, AlertTriangle, Paperclip, Calendar, ArrowDown, CheckCircle2,
  Building2, User, Clock, MessageSquare, ListChecks, FileCheck
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [session, setSession] = useState<NegotiationSessionWithDetails | null>(null);
  const [updatedLineItems, setUpdatedLineItems] = useState<UpdatedLineItem[]>([]);
  const [consultantMessage, setConsultantMessage] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [negotiationFiles, setNegotiationFiles] = useState<NegotiationFile[]>([]);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("overview");

  const { fetchNegotiationWithDetails, respondToNegotiation, cancelNegotiation, loading } = useNegotiation();
  const { comments, commentTypeLabels, commentTypeIcons } = useNegotiationComments(sessionId);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
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
            consultant_response_price: adj.target_total,
          }))
        );
      } else if (data.line_item_negotiations && data.line_item_negotiations.length > 0) {
        // Fallback to line_item_negotiations table
        setUpdatedLineItems(
          data.line_item_negotiations.map((li) => ({
            line_item_id: li.line_item_id,
            consultant_response_price: li.initiator_target_price,
          }))
        );
      }
    }

    // Load project files from RFP invite
    if (data?.proposal_id) {
      await loadProjectFiles(data.proposal_id);
    }

    // Load negotiation-specific files from database using session_id
    if (data?.id) {
      await loadNegotiationFiles(data.id);
    }

    setLoadingSession(false);
  };

  const loadNegotiationFiles = async (sessionId: string) => {
    try {
      const { data: files, error } = await supabase
        .from('negotiation_files')
        .select('id, storage_path, original_name, file_size')
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error loading negotiation files:', error);
        return;
      }

      if (files && files.length > 0) {
        const filesWithUrls: NegotiationFile[] = [];
        
        for (const file of files) {
          const { data: signedUrlData } = await supabase.storage
            .from('negotiation-files')
            .createSignedUrl(file.storage_path, 3600);
          
          filesWithUrls.push({
            id: file.id,
            name: file.original_name,
            url: signedUrlData?.signedUrl || '',
            size: file.file_size || 0,
            storagePath: file.storage_path,
          });
        }
        
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

  // Find adjustment for a given item
  const getAdjustmentForItem = (item: FeeLineItem, index: number): JsonLineItemAdjustment | undefined => {
    const itemId = getItemId(item, index);
    return jsonAdjustments.find(adj => adj.line_item_id === itemId);
  };

  // Calculate totals
  const originalTotal = session?.proposal?.price || 0;
  const targetTotal = session?.target_total || 0;
  
  const newTotal = useMemo(() => {
    if (jsonAdjustments.length > 0) {
      return updatedLineItems.reduce((sum, item) => sum + (item.consultant_response_price || 0), 0);
    }
    return targetTotal;
  }, [updatedLineItems, jsonAdjustments, targetTotal]);

  const handlePriceChange = (lineItemId: string, price: number) => {
    setUpdatedLineItems((prev) => {
      const existing = prev.find(item => item.line_item_id === lineItemId);
      if (existing) {
        return prev.map((item) =>
          item.line_item_id === lineItemId
            ? { ...item, consultant_response_price: price }
            : item
        );
      } else {
        return [...prev, { line_item_id: lineItemId, consultant_response_price: price }];
      }
    });
  };

  const handleSubmit = async () => {
    const result = await respondToNegotiation({
      session_id: sessionId,
      consultant_message: consultantMessage || undefined,
      updated_line_items: updatedLineItems.length > 0 ? updatedLineItems : [],
    });

    if (result) {
      onSuccess?.();
    }
  };

  const handleAcceptTarget = async () => {
    // Set all line items to entrepreneur's target prices
    const acceptedItems = jsonAdjustments.map(adj => ({
      line_item_id: adj.line_item_id,
      consultant_response_price: adj.target_total
    }));

    const result = await respondToNegotiation({
      session_id: sessionId,
      consultant_message: consultantMessage || "אני מקבל/ת את המחיר המבוקש",
      updated_line_items: acceptedItems.length > 0 ? acceptedItems : [],
    });

    if (result) {
      onSuccess?.();
    }
  };

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

  // Get requester info
  const requesterName = session.initiator_profile?.name || session.initiator_profile?.company_name || "יזם";
  const requesterOrg = session.initiator_profile?.company_name;
  const requestDate = session.created_at ? format(new Date(session.created_at), "d בMMMM yyyy, HH:mm", { locale: he }) : "";

  // Get milestone adjustments from session
  const milestoneAdjustments = (session.milestone_adjustments as MilestoneAdjustment[]) || [];

  // Count items with changes
  const itemsWithChanges = jsonAdjustments.filter(adj => adj.original_total !== adj.target_total).length;
  const removedItems = jsonAdjustments.filter(adj => adj.target_total === 0).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with Requester Info */}
      <Card className="bg-gradient-to-l from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900">בקשת עדכון הצעה</h2>
                <div className="flex items-center gap-2 mt-1 text-blue-700">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{requesterName}</span>
                  {requesterOrg && requesterOrg !== requesterName && (
                    <span className="text-blue-600">• {requesterOrg}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-blue-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>נשלח ב-{requestDate}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-white">
                פרויקט: {session.project?.name}
              </Badge>
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 me-2" />
                  חזרה
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">
            <TrendingDown className="h-4 w-4 me-1.5 hidden sm:inline" />
            סקירה
          </TabsTrigger>
          <TabsTrigger value="items" className="text-xs sm:text-sm py-2">
            <ListChecks className="h-4 w-4 me-1.5 hidden sm:inline" />
            פריטים
            {itemsWithChanges > 0 && (
              <Badge variant="secondary" className="ms-1.5 h-5 px-1.5 text-xs">
                {itemsWithChanges}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs sm:text-sm py-2">
            <Calendar className="h-4 w-4 me-1.5 hidden sm:inline" />
            אבני דרך
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs sm:text-sm py-2">
            <Paperclip className="h-4 w-4 me-1.5 hidden sm:inline" />
            קבצים
          </TabsTrigger>
          <TabsTrigger value="response" className="text-xs sm:text-sm py-2">
            <FileCheck className="h-4 w-4 me-1.5 hidden sm:inline" />
            תגובה
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Price Comparison Card */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-amber-600" />
                סיכום בקשת העדכון
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-white/60 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">מחיר מקורי</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(originalTotal)}</p>
                </div>
                <div className="p-4 bg-amber-100/60 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700 mb-1">מחיר יעד מבוקש</p>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(targetTotal)}</p>
                  <Badge variant="outline" className="mt-1 text-xs border-amber-400 text-amber-700">
                    {calculateReductionPercent() > 0 ? `-${calculateReductionPercent()}%` : 'ללא שינוי'}
                  </Badge>
                </div>
                <div className="p-4 bg-white/60 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">הפרש מבוקש</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(originalTotal - targetTotal)}
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-white/50 rounded">
                  <p className="text-lg font-bold text-foreground">{feeLineItems.length}</p>
                  <p className="text-xs text-muted-foreground">פריטים בהצעה</p>
                </div>
                <div className="p-2 bg-amber-50 rounded">
                  <p className="text-lg font-bold text-amber-700">{itemsWithChanges}</p>
                  <p className="text-xs text-amber-600">פריטים לעדכון</p>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <p className="text-lg font-bold text-red-600">{removedItems}</p>
                  <p className="text-xs text-red-500">פריטים להסרה</p>
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
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">תיאור</TableHead>
                        <TableHead className="text-center w-20">יחידה</TableHead>
                        <TableHead className="text-center w-20">כמות</TableHead>
                        <TableHead className="text-center w-28">מקורי</TableHead>
                        <TableHead className="text-center w-28">יעד</TableHead>
                        <TableHead className="text-center w-20">שינוי</TableHead>
                        <TableHead className="text-center w-32">הצעה חדשה</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeLineItems.map((item, index) => {
                        const itemId = getItemId(item, index);
                        const adjustment = getAdjustmentForItem(item, index);
                        const originalPrice = adjustment?.original_total ?? (item.total ?? 0);
                        const targetPrice = adjustment?.target_total ?? originalPrice;
                        const hasChange = adjustment && adjustment.original_total !== adjustment.target_total;
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
                              {item.unit || '-'}
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
                                  className={isRemoved ? "border-red-300 text-red-600 bg-red-50" : "border-amber-300 text-amber-700"}
                                >
                                  -{changePercent}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
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
                                    onClick={() => {
                                      const newSet = new Set(approvedItems);
                                      newSet.delete(itemId);
                                      setApprovedItems(newSet);
                                    }}
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
                                          const newSet = new Set(approvedItems);
                                          newSet.add(itemId);
                                          setApprovedItems(newSet);
                                          handlePriceChange(itemId, targetPrice);
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
                          <Badge variant="outline" className="border-red-300 text-red-600">
                            -{calculateReductionPercent()}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-green-700">
                          {formatCurrency(newTotal)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
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
                שינויים מבוקשים בתנאי תשלום
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestoneAdjustments.length > 0 ? (
                <div className="space-y-2">
                  {milestoneAdjustments.map((milestone, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <span className="font-medium text-blue-900">{milestone.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through">
                          {milestone.consultant_percentage ?? milestone.entrepreneur_percentage}%
                        </span>
                        <ArrowDown className="h-4 w-4 text-blue-600 rotate-[-90deg]" />
                        <Badge variant="outline" className="border-blue-400 text-blue-700">
                          {milestone.entrepreneur_percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground bg-muted/30 rounded-lg">
                  <p>לא התבקשו שינויים בתנאי תשלום</p>
                </div>
              )}

              {/* Show original milestones from proposal if available */}
              {session.proposal?.milestone_adjustments && session.proposal.milestone_adjustments.length > 0 && milestoneAdjustments.length === 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">תנאי תשלום מקוריים:</p>
                  <div className="space-y-2">
                    {session.proposal.milestone_adjustments.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm">{m.description}</span>
                        <Badge variant="secondary">{m.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4 mt-4">
          {/* Negotiation Files */}
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

          {negotiationFiles.length === 0 && projectFiles.length === 0 && !loadingFiles && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>לא צורפו קבצים לבקשה זו</p>
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
              <div className="grid grid-cols-3 gap-4 text-center">
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
                    {calculateNewReductionPercent() > 0 ? `-${calculateNewReductionPercent()}%` : 'ללא הנחה'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    onClick={handleAcceptTarget} 
                    disabled={loading || declining}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4 me-2" />
                    קבל מחיר יעד
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading || declining}
                    className="bg-primary"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin me-2" />
                        שולח...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 me-2" />
                        שלח הצעה נגדית
                      </>
                    )}
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
              האם אתה בטוח שברצונך לדחות את בקשת המשא ומתן? היזם יקבל הודעה על הדחייה.
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
    </div>
  );
};

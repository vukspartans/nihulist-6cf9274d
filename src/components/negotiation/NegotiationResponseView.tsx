import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useNegotiationComments } from "@/hooks/useNegotiationComments";
import { supabase } from "@/integrations/supabase/client";
import type { NegotiationSessionWithDetails, UpdatedLineItem } from "@/types/negotiation";
import { RefreshCw, Send, ArrowLeft, FileText, Download, Eye, Loader2, Check, XCircle, TrendingDown, AlertTriangle, Paperclip, Calendar, ArrowDown, CheckCircle2 } from "lucide-react";
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

interface NegotiationResponseViewProps {
  sessionId: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

interface LineItemDetails {
  id: string;
  name: string;
  description?: string;
  category?: string;
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
  name: string;
  url: string;
  size?: number;
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
  const [lineItemDetails, setLineItemDetails] = useState<Map<string, LineItemDetails>>(new Map());
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());

  const { fetchNegotiationWithDetails, respondToNegotiation, cancelNegotiation, loading } = useNegotiation();
  const { comments, commentTypeLabels, commentTypeIcons } = useNegotiationComments(sessionId);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoadingSession(true);
    const data = await fetchNegotiationWithDetails(sessionId);
    setSession(data);
    
    // Initialize line items with original prices
    if (data?.line_item_negotiations) {
      setUpdatedLineItems(
        data.line_item_negotiations.map((li) => ({
          line_item_id: li.line_item_id,
          consultant_response_price: li.initiator_target_price,
        }))
      );

      // Fetch line item details for names
      const lineItemIds = data.line_item_negotiations.map((li) => li.line_item_id);
      if (lineItemIds.length > 0) {
        const { data: items } = await supabase
          .from("proposal_line_items")
          .select("id, name, description, category")
          .in("id", lineItemIds);
        
        if (items) {
          const detailsMap = new Map<string, LineItemDetails>();
          items.forEach((item) => {
            detailsMap.set(item.id, {
              id: item.id,
              name: item.name,
              description: item.description || undefined,
              category: item.category || undefined,
            });
          });
          setLineItemDetails(detailsMap);
        }
      }
    }

    // Load project files from RFP invite
    if (data?.proposal_id) {
      await loadProjectFiles(data.proposal_id);
    }

    setLoadingSession(false);
  };

  const loadProjectFiles = async (proposalId: string) => {
    setLoadingFiles(true);
    try {
      // Get the proposal to find the advisor_id
      const { data: proposal } = await supabase
        .from("proposals")
        .select("advisor_id, project_id")
        .eq("id", proposalId)
        .single();

      if (proposal) {
        // Find the RFP invite for this advisor and project (join through rfps table)
        const { data: rfpInvite } = await supabase
          .from("rfp_invites")
          .select("request_files, rfps!inner(project_id)")
          .eq("advisor_id", proposal.advisor_id)
          .eq("rfps.project_id", proposal.project_id)
          .maybeSingle();

        if (rfpInvite?.request_files) {
          // Parse the request_files JSON - safely cast with type guard
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

        // Also try to get project files
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

  const handleViewFile = async (file: ProjectFile) => {
    try {
      // Try to get a signed URL if it's a storage URL
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

  const handleDownloadFile = async (file: ProjectFile) => {
    try {
      let url = file.url;
      
      // Try to get a signed URL if it's a storage URL
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

  const handlePriceChange = (lineItemId: string, price: number) => {
    setUpdatedLineItems((prev) =>
      prev.map((item) =>
        item.line_item_id === lineItemId
          ? { ...item, consultant_response_price: price }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    // Allow submitting even without line items (for proposals without itemized breakdown)
    const result = await respondToNegotiation({
      session_id: sessionId,
      consultant_message: consultantMessage || undefined,
      updated_line_items: updatedLineItems.length > 0 ? updatedLineItems : [],
    });

    if (result) {
      onSuccess?.();
    }
  };

  // Accept target price exactly as requested by entrepreneur
  const handleAcceptTarget = async () => {
    // Set all line items to entrepreneur's target prices
    const acceptedItems = updatedLineItems.map(item => {
      const negotiationItem = session?.line_item_negotiations?.find(
        li => li.line_item_id === item.line_item_id
      );
      return {
        ...item,
        consultant_response_price: negotiationItem?.initiator_target_price || item.consultant_response_price
      };
    });

    const result = await respondToNegotiation({
      session_id: sessionId,
      consultant_message: consultantMessage || "אני מקבל/ת את המחיר המבוקש",
      updated_line_items: acceptedItems.length > 0 ? acceptedItems : [],
    });

    if (result) {
      onSuccess?.();
    }
  };

  // Decline the negotiation request
  const handleDecline = async () => {
    setDeclining(true);
    const success = await cancelNegotiation(sessionId);
    setDeclining(false);
    setShowDeclineDialog(false);
    
    if (success) {
      onSuccess?.();
    }
  };

  const calculateNewTotal = (): number => {
    return updatedLineItems.reduce(
      (sum, item) => sum + item.consultant_response_price,
      0
    );
  };

  // Calculate reduction percentages
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

  // Check if session can be responded to
  const canRespond = session.status === "awaiting_response";
  const isAlreadyResponded = session.status === "responded";
  const isCancelled = session.status === "cancelled";
  const isResolved = session.status === "resolved";

  const originalTotal = session.proposal?.price || 0;
  const targetTotal = session.target_total || 0;
  const hasLineItems = session.line_item_negotiations && session.line_item_negotiations.length > 0;
  const newTotal = hasLineItems ? calculateNewTotal() : targetTotal;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">בקשת עדכון הצעה</h2>
          <p className="text-muted-foreground">
            פרויקט: {session.project?.name}
          </p>
        </div>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 me-2" />
            חזרה
          </Button>
        )}
      </div>

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
                  <RefreshCw className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800">המשא ומתן בוטל</p>
                    <p className="text-sm text-gray-700">בקשת המשא ומתן בוטלה ולא ניתן להגיב עליה.</p>
                  </div>
                </>
              ) : isResolved ? (
                <>
                  <RefreshCw className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">המשא ומתן הסתיים</p>
                    <p className="text-sm text-amber-700">המשא ומתן הסתיים ולא ניתן להגיב עליו עוד.</p>
                  </div>
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 text-amber-600" />
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

      {/* Comparison Summary Card - Key change visualization */}
      {canRespond && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              סיכום בקשת העדכון
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white/60 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">מחיר מקורי</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(originalTotal)}</p>
              </div>
              <div className="p-3 bg-amber-100/60 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 mb-1">מחיר יעד מבוקש</p>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(targetTotal)}</p>
                <Badge variant="outline" className="mt-1 text-xs border-amber-400 text-amber-700">
                  -{calculateReductionPercent()}%
                </Badge>
              </div>
              <div className="p-3 bg-white/60 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">הפרש מבוקש</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(originalTotal - targetTotal)}
                </p>
              </div>
            </div>

            {/* Show if counter-offer differs from target */}
            {hasLineItems && newTotal !== targetTotal && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">ההצעה החדשה שלך:</span>
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-blue-700">{formatCurrency(newTotal)}</span>
                    <span className="text-sm text-blue-600 ms-2">(-{calculateNewReductionPercent()}%)</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Files Section */}
      {(projectFiles.length > 0 || loadingFiles) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              קבצי הפרויקט
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

      {/* Initiator Comments */}
      {comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">הערות היזם</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200"
              >
                <span className="text-xl">
                  {commentTypeIcons[comment.comment_type]}
                </span>
                <div>
                  <p className="font-medium text-amber-800">
                    {commentTypeLabels[comment.comment_type]}
                  </p>
                  <p className="text-amber-700">{comment.content}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Global Comment */}
      {session.global_comment && (
        <Card>
          <CardContent className="pt-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">הודעה כללית:</p>
              <p>{session.global_comment}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entrepreneur's Attached Files from Negotiation Request */}
      {session.files && Array.isArray(session.files) && (session.files as NegotiationFile[]).length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <Paperclip className="h-5 w-5" />
              קבצים שצורפו לבקשה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(session.files as NegotiationFile[]).map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
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
                      className="h-8 w-8 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                      onClick={() => window.open(file.url, "_blank")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = file.url;
                        link.download = file.name;
                        link.click();
                      }}
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

      {/* Milestone Adjustments from Negotiation Request */}
      {session.milestone_adjustments && Array.isArray(session.milestone_adjustments) && (session.milestone_adjustments as MilestoneAdjustment[]).length > 0 && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
              <Calendar className="h-5 w-5" />
              שינויים מבוקשים בתנאי תשלום
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(session.milestone_adjustments as MilestoneAdjustment[]).map((milestone, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
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
          </CardContent>
        </Card>
      )}

      {/* Line Items or No Items Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {hasLineItems ? "פריטים לעדכון" : "סיכום הצעה"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasLineItems ? (
            <div className="space-y-3" dir="rtl">
              {/* Header */}
              <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                <span className="col-span-1 text-right">פריט</span>
                <span className="text-center">מחיר מקורי</span>
                <span className="text-center">יעד היזם</span>
                <span className="text-center">הפחתה</span>
                <span className="text-center">אישור</span>
                <span className="text-center">הצעה חדשה</span>
              </div>

              {session.line_item_negotiations!.map((lineItem) => {
                const updatedItem = updatedLineItems.find(
                  (u) => u.line_item_id === lineItem.line_item_id
                );
                const details = lineItemDetails.get(lineItem.line_item_id);
                const reduction = lineItem.original_price - lineItem.initiator_target_price;
                const reductionPercent = lineItem.original_price > 0 
                  ? Math.round((reduction / lineItem.original_price) * 100) 
                  : 0;
                const hasChange = reduction > 0;
                const isApproved = approvedItems.has(lineItem.line_item_id);

                return (
                  <div
                    key={lineItem.id}
                    className={`rounded-lg border p-3 ${isApproved ? 'bg-green-50/50 border-green-200' : hasChange ? 'bg-amber-50/50 border-amber-200' : 'bg-muted/30 border-muted'}`}
                  >
                    {/* Item name and description */}
                    <div className="mb-2 text-right">
                      <p className="font-medium text-sm">{details?.name || `פריט #${lineItem.line_item_id.slice(0, 8)}`}</p>
                      {details?.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {details.description}
                        </p>
                      )}
                    </div>

                    {/* Entrepreneur's note */}
                    {lineItem.initiator_note && (
                      <div className="mb-2 p-2 bg-amber-100 rounded text-xs text-amber-800 border border-amber-200 text-right">
                        <span className="font-medium">הערת היזם: </span>
                        {lineItem.initiator_note}
                      </div>
                    )}

                    {/* Price row */}
                    <div className="grid grid-cols-6 gap-2 items-center">
                      <div className="col-span-1" />
                      <p className="text-center text-muted-foreground">
                        {formatCurrency(lineItem.original_price)}
                      </p>
                      <div className="text-center">
                        <p className="font-medium text-amber-700">
                          {formatCurrency(lineItem.initiator_target_price)}
                        </p>
                      </div>
                      <div className="text-center">
                        {hasChange ? (
                          <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50">
                            -{reductionPercent}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">ללא שינוי</span>
                        )}
                      </div>
                      {/* Approval checkbox */}
                      <div className="flex justify-center">
                        {isApproved ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            אושר
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              id={`approve-${lineItem.line_item_id}`}
                              checked={false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const newSet = new Set(approvedItems);
                                  newSet.add(lineItem.line_item_id);
                                  setApprovedItems(newSet);
                                  // Auto-set price to target when approved
                                  handlePriceChange(lineItem.line_item_id, lineItem.initiator_target_price);
                                }
                              }}
                              disabled={!canRespond}
                              className="h-4 w-4"
                            />
                            <label 
                              htmlFor={`approve-${lineItem.line_item_id}`}
                              className="text-xs text-muted-foreground cursor-pointer"
                            >
                              אשר
                            </label>
                          </div>
                        )}
                      </div>
                      {/* Price input or approved indicator */}
                      {isApproved ? (
                        <div className="text-center">
                          <p className="font-medium text-green-700">
                            {formatCurrency(lineItem.initiator_target_price)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              const newSet = new Set(approvedItems);
                              newSet.delete(lineItem.line_item_id);
                              setApprovedItems(newSet);
                            }}
                            disabled={!canRespond}
                          >
                            בטל אישור
                          </Button>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          value={updatedItem?.consultant_response_price || 0}
                          onChange={(e) =>
                            handlePriceChange(
                              lineItem.line_item_id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="text-center h-9"
                          disabled={!canRespond}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-muted-foreground mb-2">
                הצעה זו אינה כוללת פירוט פריטים
              </p>
              <p className="text-sm">
                היזם מבקש הנחה כוללת על סך ההצעה. ניתן לאשר את היעד או להוסיף הודעה עם הסבר.
              </p>
            </div>
          )}

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2" dir="rtl">
            <div className="flex justify-between items-center">
              <span className="text-right">סה״כ מקורי:</span>
              <span className="font-medium text-left">{formatCurrency(originalTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-right">יעד היזם:</span>
              <span className="font-medium text-amber-600 text-left">
                {formatCurrency(targetTotal)}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium text-right">סה״כ הצעה חדשה:</span>
              <span className="font-bold text-green-600 text-left">
                {formatCurrency(newTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">הודעה ליזם (אופציונלי)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="הוסף הערות או הסברים להצעה המעודכנת..."
            value={consultantMessage}
            onChange={(e) => setConsultantMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            {canRespond ? "ביטול" : "חזרה"}
          </Button>
        )}
        {canRespond && (
          <>
            <Button variant="destructive" onClick={() => setShowDeclineDialog(true)} disabled={loading || declining}>
              <XCircle className="h-4 w-4 me-2" />
              דחה בקשה
            </Button>
            <Button variant="outline" onClick={handleAcceptTarget} disabled={loading || declining}>
              <Check className="h-4 w-4 me-2" />
              קבל מחיר יעד
            </Button>
            <Button onClick={handleSubmit} disabled={loading || declining}>
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
          </>
        )}
      </div>

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

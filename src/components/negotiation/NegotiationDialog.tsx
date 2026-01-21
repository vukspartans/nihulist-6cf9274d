import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useProposalVersions } from "@/hooks/useProposalVersions";
import { NegotiationContext } from "./NegotiationContext";
import { EnhancedLineItemTable } from "./EnhancedLineItemTable";
import { MilestoneNegotiationTable, type MilestonePayment, type MilestoneAdjustment } from "./MilestoneNegotiationTable";
import type { NegotiationCommentInput, CommentType } from "@/types/negotiation";
import { 
  RefreshCw, FileText, ClipboardList, Calendar, CreditCard, 
  MessageSquare, AlertTriangle, Upload, X, File, ExternalLink,
  Eye, Package, ChevronDown, ChevronUp, Milestone, ArrowLeft, ArrowLeftRight, Flag
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    id: string;
    price: number;
    supplier_name: string;
    project_id: string;
    current_version?: number;
    advisor_id?: string;
  };
  onSuccess?: () => void;
}

interface FeeLineItem {
  id?: string;
  item_id?: string;  // Database field
  item_number?: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number | null;
  total?: number | null;
  is_optional: boolean;
  comment?: string;
  charge_type?: string;
}

interface LineItemAdjustment {
  line_item_id: string;
  target_unit_price: number;  // Target per-unit price
  target_total: number;       // Calculated: target_unit_price × quantity
  initiator_note?: string;
  new_quantity?: number;
}

const commentTypes: { type: CommentType; label: string; icon: React.ReactNode }[] = [
  { type: "document", label: "מסמכים", icon: <FileText className="h-4 w-4" /> },
  { type: "scope", label: "היקף עבודה", icon: <ClipboardList className="h-4 w-4" /> },
  { type: "milestone", label: "אבני דרך", icon: <Calendar className="h-4 w-4" /> },
  { type: "payment", label: "תנאי תשלום", icon: <CreditCard className="h-4 w-4" /> },
];

interface UploadedFile {
  id?: string;  // Database ID from negotiation_files table
  name: string;
  url: string;
  size: number;
  storagePath?: string;
}

export const NegotiationDialog = ({
  open,
  onOpenChange,
  proposal,
  onSuccess,
}: NegotiationDialogProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [adjustments, setAdjustments] = useState<LineItemAdjustment[]>([]);
  const [globalComment, setGlobalComment] = useState("");
  const [existingSession, setExistingSession] = useState<{
    id: string;
    status: string;
    created_at: string;
  } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [comments, setComments] = useState<Record<CommentType, string>>({
    document: "",
    scope: "",
    milestone: "",
    payment: "",
    general: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingExistingFiles, setLoadingExistingFiles] = useState(false);
  const [feeLineItems, setFeeLineItems] = useState<FeeLineItem[]>([]);
  const [milestones, setMilestones] = useState<MilestonePayment[]>([]);
  const [milestoneAdjustments, setMilestoneAdjustments] = useState<MilestoneAdjustment[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showContext, setShowContext] = useState(true);

  const { createNegotiationSession, cancelNegotiation, loading } = useNegotiation();
  const { getLatestVersion } = useProposalVersions(proposal.id);

  const latestVersion = getLatestVersion();

  // Check for existing active negotiation when dialog opens
  useEffect(() => {
    const checkExistingNegotiation = async () => {
      if (!open || !proposal.id) return;
      
      setCheckingExisting(true);
      try {
        const { data } = await supabase
          .from("negotiation_sessions")
          .select("id, status, created_at")
          .eq("proposal_id", proposal.id)
          .in("status", ["open", "awaiting_response"])
          .order("created_at", { ascending: false })
          .maybeSingle();
        
        setExistingSession(data);
      } catch (err) {
        console.error("[NegotiationDialog] Error checking existing negotiation:", err);
      } finally {
        setCheckingExisting(false);
      }
    };
    
    checkExistingNegotiation();
  }, [open, proposal.id]);

  // Load proposal fee items
  useEffect(() => {
    const loadProposalData = async () => {
      if (!open || !proposal.id) return;

      setLoadingItems(true);
      try {
        const { data: proposalData } = await supabase
          .from("proposals")
          .select("fee_line_items, milestone_adjustments, consultant_request_notes")
          .eq("id", proposal.id)
          .single();

        if (proposalData?.fee_line_items) {
          const items = Array.isArray(proposalData.fee_line_items)
            ? (proposalData.fee_line_items as unknown as FeeLineItem[])
            : [];
          setFeeLineItems(items);
        } else {
          // Fall back to proposal_line_items table
          const { data: lineItems } = await supabase
            .from("proposal_line_items")
            .select("*")
            .eq("proposal_id", proposal.id)
            .order("display_order", { ascending: true });

          if (lineItems) {
            setFeeLineItems(lineItems.map(item => ({
              id: item.id,
              description: item.name,
              unit: "lump_sum",
              quantity: item.quantity || 1,
              unit_price: item.unit_price,
              total: item.total,
              is_optional: item.is_optional || false,
            })));
          }
        }

        // Load milestone data from proposal - map actual structure to expected interface
        if (proposalData?.milestone_adjustments) {
          const rawMilestones = Array.isArray(proposalData.milestone_adjustments)
            ? proposalData.milestone_adjustments
            : [];
          
          const ms: MilestonePayment[] = rawMilestones.map((m: any) => ({
            id: m.id || m.description,
            name: m.description || m.name || '',
            percentage: m.consultant_percentage ?? m.percentage ?? 0,
            trigger: m.trigger,
            description: m.description,
          }));
          setMilestones(ms);
        }
      } catch (error) {
        console.error("[NegotiationDialog] Error loading proposal data:", error);
      } finally {
        setLoadingItems(false);
      }
    };

    loadProposalData();
  }, [open, proposal.id]);

  // Each negotiation session starts fresh - no loading of previous files
  // Files are session-specific and tracked in the negotiation_files table

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error('[NegotiationDialog] No session - user must re-authenticate');
      toast.error('שגיאה: יש להתחבר מחדש למערכת');
      return;
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of acceptedFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const storagePath = `${proposal.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('negotiation-files')
          .upload(storagePath, file);

        if (error) {
          console.error('[NegotiationDialog] File upload error:', error);
          toast.error(`שגיאה בהעלאת ${file.name}: ${error.message}`);
          continue;
        }

        // Record file in database with original name preserved
        const { data: fileRecord, error: dbError } = await supabase
          .from('negotiation_files')
          .insert({
            proposal_id: proposal.id,
            storage_path: storagePath,
            original_name: file.name,  // Preserve Hebrew/original filename!
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: sessionData.session.user.id,
          })
          .select('id')
          .single();

        if (dbError) {
          console.error('[NegotiationDialog] DB record error:', dbError);
          // Continue anyway - file is uploaded even if DB record fails
        }
        
        const { data: signedUrlData } = await supabase.storage
          .from('negotiation-files')
          .createSignedUrl(storagePath, 3600);
        
        newFiles.push({
          id: fileRecord?.id,  // Track database ID for linking to session later
          name: file.name,      // Original Hebrew filename
          url: signedUrlData?.signedUrl || '',
          size: file.size,
          storagePath,
        });
      } catch (err) {
        console.error('[NegotiationDialog] Upload error:', err);
        toast.error(`שגיאה בהעלאת ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} קבצים הועלו בהצלחה`);
    }
    setUploading(false);
  }, [proposal.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper to get stable item ID
  const getItemId = (item: FeeLineItem, idx: number): string => {
    if (item.id) return item.id;
    if (item.item_id) return item.item_id;
    if (item.item_number !== undefined) return `item-${item.item_number}`;
    return `idx-${idx}`;
  };

  // Calculate the original total from all priced line items (mandatory + priced optional)
  const calculateOriginalTotal = (): number => {
    return feeLineItems.reduce((total, item) => {
      const itemTotal = item.total || ((item.unit_price ?? 0) * (item.quantity ?? 1));
      // Include all items that have a price (mandatory or optional with price > 0)
      return total + (itemTotal > 0 ? itemTotal : 0);
    }, 0);
  };

  // Calculate target total based on adjustments + unchanged items
  const calculateTargetTotal = (): number => {
    let total = 0;
    feeLineItems.forEach((item, idx) => {
      const itemId = getItemId(item, idx);
      const itemTotal = item.total || ((item.unit_price ?? 0) * (item.quantity ?? 1));
      const adj = adjustments.find((a) => a.line_item_id === itemId);
      
      if (adj) {
        // User made an adjustment - use their calculated target_total
        total += adj.target_total ?? 0;
      } else if (itemTotal > 0) {
        // Include ALL items that have a price (mandatory or optional with price)
        total += itemTotal;
      }
      // Items with 0 price (unfilled optional) are correctly excluded
    });
    return total;
  };

  const handleSubmit = async () => {
    // Version creation is now handled by the edge function (bypasses RLS)
    const versionId = latestVersion?.id || null;

    const negotiationComments: NegotiationCommentInput[] = Object.entries(comments)
      .filter(([_, content]) => content.trim())
      .map(([type, content]) => ({
        comment_type: type as CommentType,
        content: content.trim(),
      }));

    if (uploadedFiles.length > 0) {
      const filesList = uploadedFiles.map(f => `- ${f.name}`).join('\n');
      const existingDocComment = negotiationComments.find(c => c.comment_type === 'document');
      if (existingDocComment) {
        existingDocComment.content += `\n\nקבצים מצורפים:\n${filesList}`;
      } else {
        negotiationComments.push({
          comment_type: 'document',
          content: `קבצים מצורפים:\n${filesList}`,
        });
      }
    }

    // Convert adjustments to the expected format
    const lineItemAdjustments = adjustments.map(adj => ({
      line_item_id: adj.line_item_id,
      adjustment_type: "price_change" as const,
      adjustment_value: adj.target_total,
      initiator_note: adj.initiator_note,
    }));

    const result = await createNegotiationSession({
      project_id: proposal.project_id,
      proposal_id: proposal.id,
      negotiated_version_id: versionId,
      target_total: calculateTargetTotal(),
      global_comment: globalComment || undefined,
      line_item_adjustments: lineItemAdjustments.length > 0 ? lineItemAdjustments : undefined,
      milestone_adjustments: milestoneAdjustments.length > 0 ? milestoneAdjustments : undefined,
      comments: negotiationComments.length > 0 ? negotiationComments : undefined,
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    });

    if (result && 'existingSession' in result) {
      // Refresh existing session state if we get a conflict
      const { data } = await supabase
        .from("negotiation_sessions")
        .select("id, status, created_at")
        .eq("id", result.sessionId)
        .single();
      setExistingSession(data);
      return;
    }

    if (result) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleCancelExisting = async () => {
    if (!existingSession?.id) return;
    
    const cancelled = await cancelNegotiation(existingSession.id);
    if (cancelled) {
      setExistingSession(null);
      toast.success("הבקשה הקודמת בוטלה, ניתן ליצור בקשה חדשה");
    }
  };

  const handleClose = () => {
    setAdjustments([]);
    setGlobalComment("");
    setExistingSession(null);
    setUploadedFiles([]);
    setFeeLineItems([]);
    setMilestones([]);
    setMilestoneAdjustments([]);
    setComments({
      document: "",
      scope: "",
      milestone: "",
      payment: "",
      general: "",
    });
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const originalTotal = calculateOriginalTotal();
  const targetTotal = calculateTargetTotal();
  // Only calculate reduction if there are actual adjustments
  const hasAdjustments = adjustments.length > 0;
  const reductionPercent = hasAdjustments && originalTotal > 0
    ? Math.round(((originalTotal - targetTotal) / originalTotal) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-5xl w-[95vw] sm:w-auto h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden p-0"
          dir="rtl"
        >
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              בקשת הצעה מחודשת - {proposal.supplier_name}
              <RefreshCw className="h-5 w-5 text-amber-600" />
            </DialogTitle>
            <DialogDescription>
              סקור את ההצעה והגדר את הבקשות לעדכון
            </DialogDescription>
          </DialogHeader>

          {/* Show warning immediately if existing session found */}
          {checkingExisting ? (
            <div className="flex-1 flex items-center justify-center px-6 py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : existingSession ? (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <Alert variant="default" className="border-amber-500 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle>קיימת בקשה פעילה</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-3">
                    נשלחה בקשה לעדכון ב-{formatDate(existingSession.created_at)} והיא ממתינה לתגובת היועץ.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClose}
                      disabled={loading}
                    >
                      סגור
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleCancelExisting}
                      disabled={loading}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin me-2" />
                          מבטל...
                        </>
                      ) : (
                        "בטל בקשה קיימת וצור חדשה"
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
            <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 shrink-0 mx-6 mt-4 w-[calc(100%-3rem)]">
                <TabsTrigger value="overview" className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">סקירה</span>
                </TabsTrigger>
                <TabsTrigger value="items" className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">פריטים</span>
                </TabsTrigger>
                <TabsTrigger value="milestones" className="flex items-center gap-1">
                  <Milestone className="h-4 w-4" />
                  <span className="hidden sm:inline">אבני דרך</span>
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">הערות</span>
                </TabsTrigger>
                <TabsTrigger value="summary" className="flex items-center gap-1">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">סיכום</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">מידע על הבקשה וההצעה</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowContext(!showContext)}
                    >
                      {showContext ? (
                        <>
                          <ChevronUp className="h-4 w-4 me-1" />
                          הסתר
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 me-1" />
                          הצג
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {showContext && (
                    <NegotiationContext
                      proposalId={proposal.id}
                      advisorId={proposal.advisor_id}
                      projectId={proposal.project_id}
                      showRFPContext={true}
                      showProposalContext={true}
                    />
                  )}

                  {/* Quick Summary Card */}
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">מחיר הצעה</p>
                          <p className="text-xl font-bold">{formatCurrency(proposal.price)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">פריטים</p>
                          <p className="text-xl font-bold">{feeLineItems.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">גרסה</p>
                          <p className="text-xl font-bold">{proposal.current_version || 1}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Items Tab */}
                <TabsContent value="items" className="mt-0">
                  {loadingItems ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : feeLineItems.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        סמן את הפריטים שברצונך לבקש עדכון עבורם והגדר את המחיר היעד
                      </p>
                      <EnhancedLineItemTable
                        items={feeLineItems}
                        adjustments={adjustments}
                        onAdjustmentChange={setAdjustments}
                        mode="entrepreneur"
                        showOptionalItems={true}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>אין פריטים מפורטים בהצעה זו</p>
                      <p className="text-sm mt-1">
                        ניתן להוסיף הערות כלליות בלשונית "הערות וקבצים"
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Milestones Tab */}
                <TabsContent value="milestones" className="mt-0">
                  {milestones.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        בחר אבני דרך שברצונך לבקש שינוי עבורן
                      </p>
                      <MilestoneNegotiationTable
                        milestones={milestones}
                        adjustments={milestoneAdjustments}
                        onAdjustmentChange={setMilestoneAdjustments}
                        originalTotal={calculateOriginalTotal()}
                        targetTotal={calculateTargetTotal()}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>אין אבני דרך מוגדרות בהצעה זו</p>
                    </div>
                  )}
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="mt-0 space-y-4">
                {/* File Upload Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    העלאת קבצים
                  </Label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>מעלה...</span>
                      </div>
                    ) : isDragActive ? (
                      <p className="text-primary">שחרר את הקבצים כאן...</p>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        גרור קבצים לכאן או לחץ לבחירה (PDF, תמונות, Word, Excel)
                      </p>
                    )}
                  </div>

                  {loadingExistingFiles ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>טוען קבצים קיימים...</span>
                    </div>
                  ) : uploadedFiles.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {file.name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            {file.size > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({formatFileSize(file.size)})
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Comment types */}
                <div className="grid grid-cols-2 gap-4">
                  {commentTypes.map(({ type, label, icon }) => (
                    <div key={type} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {icon}
                        {label}
                      </Label>
                      <Textarea
                        placeholder={`הערות לגבי ${label}...`}
                        value={comments[type]}
                        onChange={(e) =>
                          setComments({ ...comments, [type]: e.target.value })
                        }
                        className="min-h-[60px]"
                      />
                    </div>
                  ))}
                </div>
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">סיכום הבקשה</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Price Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 text-center p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">מחיר מקורי</p>
                        <p className="text-xl font-bold">{formatCurrency(originalTotal)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">מחיר יעד</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(targetTotal)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">שינוי</p>
                        <p className={`text-xl font-bold ${
                          hasAdjustments 
                            ? reductionPercent > 0 
                              ? 'text-green-600' 
                              : reductionPercent < 0 
                                ? 'text-red-600' 
                                : 'text-muted-foreground'
                            : 'text-muted-foreground'
                        }`}>
                          {hasAdjustments 
                            ? reductionPercent > 0 
                              ? `↓ ${reductionPercent}%` 
                              : reductionPercent < 0 
                                ? `↑ ${Math.abs(reductionPercent)}%`
                                : "ללא שינוי במחיר"
                            : "ללא שינוי"}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Line Items Changes */}
                    {adjustments.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <ArrowLeftRight className="h-4 w-4" />
                          פריטים שנבחרו לעדכון ({adjustments.length}):
                        </p>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {adjustments.map((adj, adjIdx) => {
                            // Use index-aware lookup to match how IDs are generated
                            const itemIndex = feeLineItems.findIndex((item, idx) => 
                              getItemId(item, idx) === adj.line_item_id
                            );
                            const item = itemIndex >= 0 ? feeLineItems[itemIndex] : undefined;
                            const originalPrice = item?.total || (item?.quantity ?? 1) * (item?.unit_price ?? 0) || 0;
                            const changePercent = originalPrice > 0 
                              ? Math.round(((originalPrice - adj.target_total) / originalPrice) * 100)
                              : 0;
                            
                            return (
                              <div key={adjIdx} className="bg-muted/30 px-3 py-2 rounded-lg space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">{item?.description || adj.line_item_id}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    changePercent > 0 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                      : changePercent < 0 
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {changePercent > 0 ? `↓${changePercent}%` : changePercent < 0 ? `↑${Math.abs(changePercent)}%` : 'ללא שינוי'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground line-through">{formatCurrency(originalPrice)}</span>
                                  <ArrowLeft className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium text-primary">{formatCurrency(adj.target_total)}</span>
                                </div>
                                {adj.initiator_note && (
                                  <p className="text-xs text-muted-foreground mt-1 border-t border-border/50 pt-1">
                                    הערה: {adj.initiator_note}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Milestone Adjustments Summary */}
                    {milestoneAdjustments.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Flag className="h-4 w-4" />
                          שינויים באבני דרך ({milestoneAdjustments.length}):
                        </p>
                        <div className="space-y-2">
                          {milestoneAdjustments.map((adj, idx) => {
                            const milestone = milestones.find(m => m.id === adj.milestone_id);
                            const originalAmount = (adj.original_percentage / 100) * originalTotal;
                            const targetAmount = (adj.target_percentage / 100) * targetTotal;
                            
                            return (
                              <div key={idx} className="bg-muted/30 px-3 py-2 rounded-lg space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">{milestone?.name || `אבן דרך ${idx + 1}`}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">
                                    {adj.original_percentage}% ({formatCurrency(originalAmount)})
                                  </span>
                                  <ArrowLeft className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium text-primary">
                                    {adj.target_percentage}% ({formatCurrency(targetAmount)})
                                  </span>
                                </div>
                                {adj.initiator_note && (
                                  <p className="text-xs text-muted-foreground mt-1 border-t border-border/50 pt-1">
                                    הערה: {adj.initiator_note}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Comments Summary */}
                    {Object.entries(comments).some(([_, value]) => value.trim()) && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          הערות לפי נושא:
                        </p>
                        <div className="space-y-2">
                          {Object.entries(comments)
                            .filter(([_, value]) => value.trim())
                            .map(([type, value]) => {
                              const commentType = commentTypes.find(ct => ct.type === type);
                              return (
                                <div key={type} className="bg-muted/30 px-3 py-2 rounded-lg">
                                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                    {commentType?.icon}
                                    {commentType?.label}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{value}</p>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Attached Files */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <File className="h-4 w-4" />
                          קבצים מצורפים ({uploadedFiles.length}):
                        </p>
                        <ul className="text-sm space-y-1 bg-muted/30 rounded-lg p-3">
                          {uploadedFiles.map((file, index) => (
                            <li key={index} className="flex items-center gap-2 text-muted-foreground">
                              <File className="h-3 w-3" />
                              <span>{file.name}</span>
                              {file.size > 0 && (
                                <span className="text-xs">({formatFileSize(file.size)})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Separator />

                    {/* Global Message */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        הודעה כללית ליועץ
                      </Label>
                      <Textarea
                        placeholder="הודעה כללית ליועץ..."
                        value={globalComment}
                        onChange={(e) => setGlobalComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  </CardContent>
                </Card>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="shrink-0 gap-2 px-6 py-4 border-t bg-background flex-row-reverse sm:flex-row">
              <Button onClick={handleSubmit} disabled={loading || uploading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin me-2" />
                    שולח...
                  </>
                ) : (
                  "שלח בקשה לעדכון"
                )}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                ביטול
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

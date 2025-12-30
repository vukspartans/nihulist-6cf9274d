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
import { LineItemEditor } from "./LineItemEditor";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useLineItems } from "@/hooks/useLineItems";
import { useProposalVersions } from "@/hooks/useProposalVersions";
import type { LineItemAdjustment, NegotiationCommentInput, CommentType } from "@/types/negotiation";
import { RefreshCw, FileText, ClipboardList, Calendar, CreditCard, MessageSquare, AlertTriangle, Upload, X, File, ExternalLink } from "lucide-react";
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
  };
  onSuccess?: () => void;
}

const commentTypes: { type: CommentType; label: string; icon: React.ReactNode }[] = [
  { type: "document", label: "מסמכים", icon: <FileText className="h-4 w-4" /> },
  { type: "scope", label: "היקף עבודה", icon: <ClipboardList className="h-4 w-4" /> },
  { type: "milestone", label: "אבני דרך", icon: <Calendar className="h-4 w-4" /> },
  { type: "payment", label: "תנאי תשלום", icon: <CreditCard className="h-4 w-4" /> },
];

interface UploadedFile {
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
  const [activeTab, setActiveTab] = useState("items");
  const [adjustments, setAdjustments] = useState<LineItemAdjustment[]>([]);
  const [globalComment, setGlobalComment] = useState("");
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
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

  const { createNegotiationSession, cancelNegotiation, loading } = useNegotiation();
  const { lineItems, loading: lineItemsLoading } = useLineItems(proposal.id);
  const { getLatestVersion } = useProposalVersions(proposal.id);

  const latestVersion = getLatestVersion();

  // Prefetch existing files when dialog opens
  useEffect(() => {
    const fetchExistingFiles = async () => {
      if (!open || !proposal.id) return;
      
      setLoadingExistingFiles(true);
      try {
        const { data: files, error } = await supabase.storage
          .from('negotiation-files')
          .list(proposal.id);

        if (error) {
          console.log('[NegotiationDialog] No existing files or bucket access:', error.message);
          setLoadingExistingFiles(false);
          return;
        }

        if (files && files.length > 0) {
          const filesWithUrls: UploadedFile[] = [];
          
          for (const file of files) {
            const storagePath = `${proposal.id}/${file.name}`;
            const { data: signedUrlData } = await supabase.storage
              .from('negotiation-files')
              .createSignedUrl(storagePath, 3600); // 1 hour expiry
            
            if (signedUrlData?.signedUrl) {
              filesWithUrls.push({
                name: file.name,
                url: signedUrlData.signedUrl,
                size: file.metadata?.size || 0,
                storagePath,
              });
            }
          }
          
          if (filesWithUrls.length > 0) {
            setUploadedFiles(filesWithUrls);
          }
        }
      } catch (err) {
        console.error('[NegotiationDialog] Error fetching existing files:', err);
      } finally {
        setLoadingExistingFiles(false);
      }
    };

    fetchExistingFiles();
  }, [open, proposal.id]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Check auth before upload
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
        
        // Use signed URL since bucket is private
        const { data: signedUrlData } = await supabase.storage
          .from('negotiation-files')
          .createSignedUrl(storagePath, 3600);
        
        newFiles.push({
          name: file.name,
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
  }, [proposal.id, proposal.project_id]);

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
    maxSize: 10 * 1024 * 1024, // 10MB
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

  const calculateTargetTotal = (): number => {
    let total = 0;
    lineItems.forEach((item) => {
      const adj = adjustments.find((a) => a.line_item_id === item.id);
      if (adj) {
        if (adj.adjustment_type === "price_change") {
          total += adj.adjustment_value;
        } else if (adj.adjustment_type === "flat_discount") {
          total += item.total - adj.adjustment_value;
        } else if (adj.adjustment_type === "percentage_discount") {
          total += item.total * (1 - adj.adjustment_value / 100);
        }
      } else if (!item.is_optional) {
        total += item.total;
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    let versionId = latestVersion?.id;
    
    // If no version exists, create one from the proposal data
    if (!versionId) {
      const { data: proposalData } = await supabase
        .from("proposals")
        .select("price, timeline_days, scope_text, terms, conditions_json")
        .eq("id", proposal.id)
        .single();
      
      if (proposalData) {
        const { data: newVersion, error: versionError } = await supabase
          .from("proposal_versions")
          .insert({
            proposal_id: proposal.id,
            version_number: 1,
            price: proposalData.price,
            timeline_days: proposalData.timeline_days,
            scope_text: proposalData.scope_text,
            terms: proposalData.terms,
            conditions_json: proposalData.conditions_json,
            change_reason: "גרסה ראשונית",
          })
          .select("id")
          .single();
        
        if (versionError || !newVersion) {
          console.error("[NegotiationDialog] Failed to create version");
          return;
        }
        versionId = newVersion.id;
      } else {
        console.error("[NegotiationDialog] No proposal data found");
        return;
      }
    }

    const negotiationComments: NegotiationCommentInput[] = Object.entries(comments)
      .filter(([_, content]) => content.trim())
      .map(([type, content]) => ({
        comment_type: type as CommentType,
        content: content.trim(),
      }));

    // Add file references to the document comment if files were uploaded
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

    const result = await createNegotiationSession({
      project_id: proposal.project_id,
      proposal_id: proposal.id,
      negotiated_version_id: versionId,
      target_total: calculateTargetTotal(),
      global_comment: globalComment || undefined,
      line_item_adjustments: adjustments.length > 0 ? adjustments : undefined,
      comments: negotiationComments.length > 0 ? negotiationComments : undefined,
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    });

    // Handle existing session response
    if (result && 'existingSession' in result) {
      setExistingSessionId(result.sessionId);
      return;
    }

    if (result) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleCancelAndRetry = async () => {
    if (!existingSessionId) return;
    
    const cancelled = await cancelNegotiation(existingSessionId);
    if (cancelled) {
      setExistingSessionId(null);
      // Retry submission after cancellation
      await handleSubmit();
    }
  };

  const handleClose = () => {
    setAdjustments([]);
    setGlobalComment("");
    setExistingSessionId(null);
    setUploadedFiles([]);
    setComments({
      document: "",
      scope: "",
      milestone: "",
      payment: "",
      general: "",
    });
    onOpenChange(false);
  };

  const targetTotal = calculateTargetTotal();
  const reductionPercent =
    proposal.price > 0
      ? Math.round(((proposal.price - targetTotal) / proposal.price) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            בקשת הצעה מחודשת - {proposal.supplier_name}
            <RefreshCw className="h-5 w-5 text-amber-600" />
          </DialogTitle>
          <DialogDescription>
            ערוך את הפריטים והוסף הערות לבקשת עדכון ההצעה
          </DialogDescription>
        </DialogHeader>

        {existingSessionId ? (
          <Alert variant="default" className="border-amber-500 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>בקשת עדכון קיימת</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">קיימת כבר בקשת עדכון פעילה להצעה זו. ניתן לבטל אותה ולשלוח בקשה חדשה.</p>
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
                  onClick={handleCancelAndRetry}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin me-2" />
                      מבטל...
                    </>
                  ) : (
                    "בטל ושלח בקשה חדשה"
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="items">פריטים</TabsTrigger>
                <TabsTrigger value="comments">הערות וקבצים</TabsTrigger>
                <TabsTrigger value="summary">סיכום</TabsTrigger>
              </TabsList>

          <TabsContent value="items" className="mt-4">
            {lineItemsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : lineItems.length > 0 ? (
              <LineItemEditor
                lineItems={lineItems}
                adjustments={adjustments}
                onAdjustmentChange={setAdjustments}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>אין פריטים מפורטים בהצעה זו</p>
                <p className="text-sm mt-1">
                  ניתן להוסיף הערות כלליות בלשונית "הערות"
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-4 space-y-4">
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

              {/* Uploaded files list */}
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

            {/* Comment types */}
            {commentTypes.map(({ type, label, icon }) => (
              <div key={type} className="space-y-2">
                <Label className="flex items-center gap-2">
                  {label}
                  {icon}
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
          </TabsContent>

          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">מחיר מקורי:</span>
                <span className="font-medium">
                  {formatCurrency(proposal.price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">מחיר יעד:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(targetTotal)}
                </span>
              </div>
              {reductionPercent > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">הפחתה:</span>
                  <span className="text-red-600 font-medium">
                    ↓ {reductionPercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Uploaded files summary */}
            {uploadedFiles.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <Label className="text-sm text-muted-foreground mb-2 block">קבצים מצורפים ({uploadedFiles.length})</Label>
                <ul className="text-sm space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <File className="h-3 w-3 text-muted-foreground" />
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                הערה כללית
                <MessageSquare className="h-4 w-4" />
              </Label>
              <Textarea
                placeholder="הודעה כללית ליועץ..."
                value={globalComment}
                onChange={(e) => setGlobalComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 mt-4">
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

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useNegotiationComments } from "@/hooks/useNegotiationComments";
import { supabase } from "@/integrations/supabase/client";
import type { NegotiationSessionWithDetails, UpdatedLineItem } from "@/types/negotiation";
import { RefreshCw, Send, ArrowLeft, FileText, Download, Eye, Loader2 } from "lucide-react";

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

  const { fetchNegotiationWithDetails, respondToNegotiation, loading } = useNegotiation();
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

  const calculateNewTotal = (): number => {
    return updatedLineItems.reduce(
      (sum, item) => sum + item.consultant_response_price,
      0
    );
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

      {/* Line Items or No Items Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {hasLineItems ? "פריטים לעדכון" : "סיכום הצעה"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasLineItems ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                <span>פריט</span>
                <span className="text-center">מחיר מקורי</span>
                <span className="text-center">יעד היזם</span>
                <span className="text-center">הצעה חדשה שלי</span>
              </div>

              {session.line_item_negotiations!.map((lineItem) => {
                const updatedItem = updatedLineItems.find(
                  (u) => u.line_item_id === lineItem.line_item_id
                );
                const details = lineItemDetails.get(lineItem.line_item_id);

                return (
                  <div
                    key={lineItem.id}
                    className="grid grid-cols-4 gap-4 items-center py-2"
                  >
                    <div>
                      <p className="font-medium">{details?.name || `פריט #${lineItem.line_item_id.slice(0, 8)}`}</p>
                      {details?.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {details.description}
                        </p>
                      )}
                      {lineItem.initiator_note && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          {lineItem.initiator_note}
                        </p>
                      )}
                    </div>
                    <p className="text-center">
                      {formatCurrency(lineItem.original_price)}
                    </p>
                    <p className="text-center text-amber-600 font-medium">
                      {formatCurrency(lineItem.initiator_target_price)}
                    </p>
                    <Input
                      type="number"
                      value={updatedItem?.consultant_response_price || 0}
                      onChange={(e) =>
                        handlePriceChange(
                          lineItem.line_item_id,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="text-center"
                    />
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
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>סה״כ מקורי:</span>
              <span className="font-medium">{formatCurrency(originalTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>יעד היזם:</span>
              <span className="font-medium text-amber-600">
                {formatCurrency(targetTotal)}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-medium">סה״כ הצעה חדשה:</span>
              <span className="font-bold text-green-600">
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
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onBack}>
          ביטול
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin me-2" />
              שולח...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 me-2" />
              שלח הצעה מעודכנת
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

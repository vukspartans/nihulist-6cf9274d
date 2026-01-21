import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useNegotiation } from "@/hooks/useNegotiation";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  Building2,
  Calendar,
  MessageSquare,
  FileText,
  Download,
  Eye,
  Loader2,
  CheckCircle,
  ArrowDown,
  ArrowUp,
  Minus,
  ListChecks,
  Clock,
  XCircle,
} from "lucide-react";
import { getFeeUnitLabel } from "@/constants/rfpUnits";
import type { NegotiationSessionWithDetails, JsonLineItemAdjustment, FeeLineItem } from "@/types/negotiation";

interface EntrepreneurNegotiationViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onAccept?: () => void;
  onContinueNegotiation?: () => void;
}

interface AdvisorResponseFile {
  url: string;
  name: string;
  size: number;
  mime?: string;
  uploaded_at?: string;
}

interface MilestoneResponse {
  description: string;
  originalPercentage: number;
  entrepreneurPercentage: number;
  advisorResponsePercentage: number;
  accepted: boolean;
}

export const EntrepreneurNegotiationView = ({
  open,
  onOpenChange,
  sessionId,
  onAccept,
  onContinueNegotiation,
}: EntrepreneurNegotiationViewProps) => {
  const [session, setSession] = useState<NegotiationSessionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [advisorFiles, setAdvisorFiles] = useState<AdvisorResponseFile[]>([]);
  const [milestoneResponses, setMilestoneResponses] = useState<MilestoneResponse[]>([]);

  const { fetchNegotiationWithDetails } = useNegotiation();

  useEffect(() => {
    if (open && sessionId) {
      loadSession();
    }
  }, [open, sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    
    const data = await fetchNegotiationWithDetails(sessionId);
    setSession(data);

    // Extract advisor response files
    if (data?.files) {
      const filesData = data.files as any;
      if (filesData.advisor_response_files) {
        setAdvisorFiles(filesData.advisor_response_files);
      }
      if (filesData.advisor_milestone_responses) {
        setMilestoneResponses(filesData.advisor_milestone_responses);
      }
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: he });
  };

  // Parse line item data
  const feeLineItems = useMemo((): FeeLineItem[] => {
    return session?.proposal?.fee_line_items || [];
  }, [session?.proposal?.fee_line_items]);

  const jsonAdjustments = useMemo((): JsonLineItemAdjustment[] => {
    const filesData = session?.files as any;
    return filesData?.json_line_item_adjustments || [];
  }, [session?.files]);

  const lineItemNegotiations = session?.line_item_negotiations || [];

  // Get item details with all prices
  const getItemDetails = useCallback((item: FeeLineItem, index: number) => {
    const itemId = item.item_id || `idx-${item.item_number ?? index}`;
    const originalPrice = item.total || (item.unit_price || 0) * (item.quantity || 1);

    // Find entrepreneur's target from adjustments
    const adjustment = jsonAdjustments.find(adj => 
      adj.line_item_id === itemId || 
      adj.line_item_id === item.item_id ||
      adj.line_item_id === `idx-${item.item_number ?? index}`
    );
    const targetPrice = adjustment?.target_total ?? adjustment?.adjustment_value ?? originalPrice;

    // Find advisor's response
    const negotiation = lineItemNegotiations.find(n => n.line_item_id === itemId);
    const advisorResponse = negotiation?.consultant_response_price ?? targetPrice;

    return {
      itemId,
      name: item.description || "פריט",
      unit: item.unit,
      quantity: item.quantity,
      originalPrice,
      targetPrice,
      advisorResponse,
      hasChange: originalPrice !== targetPrice || targetPrice !== advisorResponse,
      advisorAccepted: advisorResponse === targetPrice,
    };
  }, [jsonAdjustments, lineItemNegotiations]);

  // Calculate totals
  const totals = useMemo(() => {
    let originalTotal = 0;
    let targetTotal = 0;
    let advisorTotal = 0;

    feeLineItems.forEach((item, idx) => {
      const details = getItemDetails(item, idx);
      originalTotal += details.originalPrice;
      targetTotal += details.targetPrice;
      advisorTotal += details.advisorResponse;
    });

    // Fallback to session values if no line items
    if (!feeLineItems.length) {
      originalTotal = session?.proposal?.price || 0;
      targetTotal = session?.target_total || originalTotal;
      advisorTotal = targetTotal; // Default
    }

    return { originalTotal, targetTotal, advisorTotal };
  }, [feeLineItems, getItemDetails, session]);

  const getDiffIcon = (original: number, target: number) => {
    if (target < original) return <ArrowDown className="w-3.5 h-3.5 text-green-600" />;
    if (target > original) return <ArrowUp className="w-3.5 h-3.5 text-red-600" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const handleDownloadFile = async (file: AdvisorResponseFile) => {
    try {
      if (file.url.includes("supabase")) {
        const pathMatch = file.url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
        if (pathMatch) {
          const [, bucket, path] = pathMatch;
          const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
          if (data?.signedUrl) {
            const response = await fetch(data.signedUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            return;
          }
        }
      }
      window.open(file.url, "_blank");
    } catch {
      window.open(file.url, "_blank");
    }
  };

  if (!sessionId) return null;

  // Determine if this is a pending request (entrepreneur's view) or advisor's response
  const isAwaitingResponse = session?.status === 'awaiting_response' || session?.status === 'open';
  const dialogTitle = isAwaitingResponse ? 'בקשה לשינויים' : 'תגובת היועץ למשא ומתן';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] overflow-hidden p-0 flex flex-col" dir="rtl">
        <DialogHeader className="p-4 pb-3 flex-shrink-0 border-b">
          <DialogTitle className="text-lg font-bold text-right flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {dialogTitle}
            {isAwaitingResponse && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 mr-2">
                ממתין לתגובה
              </Badge>
            )}
          </DialogTitle>
          {session && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {isAwaitingResponse ? `נשלחה ל${session.advisor?.company_name || "יועץ"}` : (session.advisor?.company_name || "יועץ")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {isAwaitingResponse 
                  ? formatDate(session.created_at)
                  : session.responded_at 
                    ? formatDate(session.responded_at) 
                    : formatDate(session.created_at)}
              </span>
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : session ? (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full flex flex-row-reverse justify-start rounded-none border-b bg-transparent px-4 flex-shrink-0">
                <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  סקירה
                </TabsTrigger>
                <TabsTrigger value="items" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  פריטים
                </TabsTrigger>
                {milestoneResponses.length > 0 && (
                  <TabsTrigger value="milestones" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    אבני דרך
                  </TabsTrigger>
                )}
                {advisorFiles.length > 0 && (
                  <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    קבצים
                  </TabsTrigger>
                )}
              </TabsList>

              <ScrollArea className="flex-1 min-h-0">
                {/* Overview Tab */}
                <TabsContent value="overview" className="p-4 space-y-4 m-0">
                  {/* Price Summary Card */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      {isAwaitingResponse ? (
                        // Show entrepreneur's request summary
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">מחיר מקורי</p>
                            <p className="font-bold text-lg">{formatCurrency(totals.originalTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">מחיר שביקשת</p>
                            <p className="font-bold text-lg text-primary">{formatCurrency(totals.targetTotal)}</p>
                          </div>
                        </div>
                      ) : (
                        // Show full comparison with advisor response
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">מחיר מקורי</p>
                            <p className="font-bold text-lg">{formatCurrency(totals.originalTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">מחיר שביקשת</p>
                            <p className="font-bold text-lg text-primary">{formatCurrency(totals.targetTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">תגובת היועץ</p>
                            <p className="font-bold text-lg text-green-600">{formatCurrency(totals.advisorTotal)}</p>
                          </div>
                        </div>
                      )}
                      {!isAwaitingResponse && totals.advisorTotal !== totals.targetTotal && (
                        <div className="mt-3 pt-3 border-t text-center">
                          <Badge variant={totals.advisorTotal <= totals.targetTotal ? "default" : "secondary"}>
                            {totals.advisorTotal <= totals.targetTotal 
                              ? "היועץ קיבל את הבקשה או הציע פחות!" 
                              : `הפרש: ${formatCurrency(totals.advisorTotal - totals.targetTotal)}`}
                          </Badge>
                        </div>
                      )}
                      {isAwaitingResponse && session?.target_reduction_percent && (
                        <div className="mt-3 pt-3 border-t text-center">
                          <Badge variant="outline" className="bg-primary/10">
                            הנחה מבוקשת: {session.target_reduction_percent}%
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Message Card - Show initiator message for pending, consultant response for responded */}
                  {isAwaitingResponse ? (
                    session.initiator_message && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            ההודעה שלך ליועץ
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap text-right">
                            {session.initiator_message}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  ) : (
                    session.consultant_response_message && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            הודעת היועץ
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap text-right">
                            {session.consultant_response_message}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <ListChecks className="w-5 h-5 mx-auto mb-1 text-primary" />
                        <p className="text-xs text-muted-foreground">פריטים</p>
                        <p className="font-bold">{feeLineItems.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <FileText className="w-5 h-5 mx-auto mb-1 text-primary" />
                        <p className="text-xs text-muted-foreground">קבצים</p>
                        <p className="font-bold">{advisorFiles.length}</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Items Tab */}
                <TabsContent value="items" className="p-4 m-0">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">פריט</TableHead>
                            <TableHead className="text-center">מקורי</TableHead>
                            <TableHead className="text-center">בקשה</TableHead>
                            {!isAwaitingResponse && (
                              <>
                                <TableHead className="text-center">תגובה</TableHead>
                                <TableHead className="text-center w-12">סטטוס</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {feeLineItems.map((item, idx) => {
                            const details = getItemDetails(item, idx);
                            return (
                              <TableRow key={details.itemId}>
                                <TableCell className="text-right">
                                  <div>
                                    <p className="font-medium text-sm">{details.name}</p>
                                    {details.unit && details.quantity && (
                                      <p className="text-xs text-muted-foreground">
                                        {details.quantity} × {getFeeUnitLabel(details.unit)}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {formatCurrency(details.originalPrice)}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  <div className="flex items-center justify-center gap-1">
                                    {getDiffIcon(details.originalPrice, details.targetPrice)}
                                    <span className="text-primary font-medium">
                                      {formatCurrency(details.targetPrice)}
                                    </span>
                                  </div>
                                </TableCell>
                                {!isAwaitingResponse && (
                                  <>
                                    <TableCell className="text-center text-sm font-bold text-green-600">
                                      {formatCurrency(details.advisorResponse)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {details.advisorAccepted ? (
                                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-amber-500 mx-auto" />
                                      )}
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-muted/50">
                            <TableCell className="text-right font-bold">סה״כ</TableCell>
                            <TableCell className="text-center font-bold">
                              {formatCurrency(totals.originalTotal)}
                            </TableCell>
                            <TableCell className="text-center font-bold text-primary">
                              {formatCurrency(totals.targetTotal)}
                            </TableCell>
                            {!isAwaitingResponse && (
                              <>
                                <TableCell className="text-center font-bold text-green-600">
                                  {formatCurrency(totals.advisorTotal)}
                                </TableCell>
                                <TableCell />
                              </>
                            )}
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Milestones Tab */}
                <TabsContent value="milestones" className="p-4 m-0">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">אבן דרך</TableHead>
                            <TableHead className="text-center">מקורי</TableHead>
                            <TableHead className="text-center">בקשה</TableHead>
                            <TableHead className="text-center">תגובה</TableHead>
                            <TableHead className="text-center w-12">קיבל</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {milestoneResponses.map((milestone, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-right font-medium text-sm">
                                {milestone.description}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {milestone.originalPercentage}%
                              </TableCell>
                              <TableCell className="text-center text-sm text-primary font-medium">
                                {milestone.entrepreneurPercentage}%
                              </TableCell>
                              <TableCell className="text-center text-sm font-bold text-green-600">
                                {milestone.advisorResponsePercentage}%
                              </TableCell>
                              <TableCell className="text-center">
                                {milestone.accepted ? (
                                  <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-amber-500 mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Files Tab */}
                <TabsContent value="files" className="p-4 m-0">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        קבצים שצירף היועץ
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {advisorFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                            {file.size && (
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024).toFixed(0)} KB)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(file.url, "_blank")}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDownloadFile(file)}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="p-4 border-t flex-shrink-0">
              <div className="flex items-center gap-2 w-full justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  סגור
                </Button>
                {/* Only show action buttons when advisor has responded */}
                {!isAwaitingResponse && (
                  <>
                    {onContinueNegotiation && (
                      <Button variant="outline" onClick={onContinueNegotiation}>
                        <MessageSquare className="w-4 h-4 me-1" />
                        המשך משא ומתן
                      </Button>
                    )}
                    {onAccept && (
                      <Button onClick={onAccept} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 me-1" />
                        קבל הצעה נגדית
                      </Button>
                    )}
                  </>
                )}
              </div>
            </DialogFooter>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            לא נמצאה תגובה
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

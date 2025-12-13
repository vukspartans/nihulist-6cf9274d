import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProposalApprovalDialog } from '@/components/ProposalApprovalDialog';
import { useToast } from '@/hooks/use-toast';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Banknote, 
  Clock, 
  Download, 
  CheckCircle, 
  XCircle, 
  FileSignature, 
  AlertCircle,
  Calendar,
  Shield,
  Eye,
  Sparkles,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface ProposalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    id: string;
    project_id: string;
    advisor_id: string;
    supplier_name: string;
    price: number;
    timeline_days: number;
    currency?: string;
    scope_text?: string;
    conditions_json?: {
      payment_terms?: string;
      assumptions?: string;
      exclusions?: string;
      validity_days?: number;
    };
    files?: UploadedFile[];
    signature_blob?: string;
    signature_meta_json?: {
      timestamp?: string;
      signer_name?: string;
      signer_email?: string;
    };
    status: string;
    submitted_at: string;
  };
  onSuccess?: () => void;
}

export const ProposalDetailDialog = ({
  open,
  onOpenChange,
  proposal,
  onSuccess,
}: ProposalDetailDialogProps) => {
  const [filesWithUrls, setFilesWithUrls] = useState<Array<UploadedFile & { signedUrl?: string }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [fileSummaries, setFileSummaries] = useState<Record<string, string>>({});
  const [fileSummaryLoading, setFileSummaryLoading] = useState<Record<string, boolean>>({});
  
  const { toast } = useToast();
  const { rejectProposal, loading: rejectLoading } = useProposalApproval();

  // Mark proposal as seen when dialog opens
  useEffect(() => {
    if (open && proposal.id) {
      markProposalAsSeen(proposal.id);
    }
  }, [open, proposal.id]);

  useEffect(() => {
    if (open && proposal.files && proposal.files.length > 0) {
      loadSignedUrls();
    }
  }, [open, proposal.id]);

  const markProposalAsSeen = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ seen_by_entrepreneur_at: new Date().toISOString() })
        .eq('id', proposalId)
        .is('seen_by_entrepreneur_at', null);

      if (error) {
        console.error('[ProposalDetail] Error marking proposal as seen:', error);
      } else {
        console.info('[ProposalDetail] Marked proposal as seen:', proposalId);
      }
    } catch (error) {
      console.error('[ProposalDetail] Error in markProposalAsSeen:', error);
    }
  };

  const loadSignedUrls = async () => {
    setLoadingFiles(true);
    try {
      const files = proposal.files || [];
      
      const filesWithSignedUrls = await Promise.all(
        files.map(async (file) => {
          // Use the stored url path directly
          const filePath = file.url || `${proposal.id}/${file.name}`;
          
          const { data, error } = await supabase.storage
            .from('proposal-files')
            .createSignedUrl(filePath, 3600);
          
          if (error) {
            console.error('[ProposalDetail] Error getting signed URL for:', file.name, error);
          }
          
          return {
            ...file,
            signedUrl: error ? undefined : data?.signedUrl,
          };
        })
      );
      
      setFilesWithUrls(filesWithSignedUrls);
    } catch (error) {
      console.error('[ProposalDetail] Error loading signed URLs:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את הקבצים המצורפים',
        variant: 'destructive',
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleViewFile = async (file: UploadedFile & { signedUrl?: string }) => {
    if (!file.signedUrl) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לצפות בקובץ',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(file.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[ProposalDetail] View error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לפתוח את הקובץ',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (file: UploadedFile & { signedUrl?: string }) => {
    if (!file.signedUrl) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את הקובץ',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(file.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('[ProposalDetail] Download error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את הקובץ',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('נא להזין סיבת דחייה:');
    if (!reason || reason.trim().length < 10) {
      toast({
        title: 'שגיאה',
        description: 'נדרשת סיבת דחייה (מינימום 10 תווים)',
        variant: 'destructive',
      });
      return;
    }

    const result = await rejectProposal(proposal.id, proposal.project_id, reason);
    if (result?.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  // AI Analysis functions
  const generateAiAnalysis = async () => {
    setAiAnalysisLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-proposal', {
        body: { proposalId: proposal.id }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        throw new Error('No analysis returned');
      }
    } catch (error) {
      console.error('[ProposalDetail] AI analysis error:', error);
      toast({
        title: 'שגיאה בניתוח',
        description: 'לא ניתן לייצר ניתוח AI כרגע',
        variant: 'destructive',
      });
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const generateFileSummary = async (file: UploadedFile) => {
    setFileSummaryLoading(prev => ({ ...prev, [file.name]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('analyze-proposal-file', {
        body: { 
          proposalId: proposal.id,
          fileName: file.name,
          fileUrl: file.url
        }
      });

      if (error) throw error;

      if (data?.summary) {
        setFileSummaries(prev => ({ ...prev, [file.name]: data.summary }));
      } else {
        throw new Error('No summary returned');
      }
    } catch (error) {
      console.error('[ProposalDetail] File summary error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לייצר תקציר לקובץ',
        variant: 'destructive',
      });
    } finally {
      setFileSummaryLoading(prev => ({ ...prev, [file.name]: false }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: proposal.currency || 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      submitted: { variant: 'secondary', label: 'הוגש' },
      accepted: { variant: 'success', label: 'אושר' },
      rejected: { variant: 'destructive', label: 'נדחה' },
      withdrawn: { variant: 'muted', label: 'בוטל' },
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <DialogTitle className="text-2xl font-bold text-right">
                  הצעת מחיר
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1 text-right">
                  {proposal.supplier_name}
                </p>
              </div>
              {getStatusBadge(proposal.status)}
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            {/* RTL Tab ordering - flex-row-reverse ensures פרטים is on the right */}
            <TabsList className="w-full flex flex-row-reverse justify-end overflow-x-auto md:grid md:grid-cols-5" dir="rtl">
              <TabsTrigger value="details" className="flex-row-reverse">
                <FileText className="w-4 h-4 mr-2" />
                פרטים
              </TabsTrigger>
              <TabsTrigger value="conditions" className="flex-row-reverse">
                <Shield className="w-4 h-4 mr-2" />
                תנאים
              </TabsTrigger>
              <TabsTrigger value="files" className="flex-row-reverse">
                <Download className="w-4 h-4 mr-2" />
                קבצים ({proposal.files?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="signature" className="flex-row-reverse">
                <FileSignature className="w-4 h-4 mr-2" />
                חתימה
              </TabsTrigger>
              <TabsTrigger value="actions" disabled={proposal.status !== 'submitted'} className="flex-row-reverse">
                <CheckCircle className="w-4 h-4 mr-2" />
                פעולות
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-right">סיכום ההצעה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <div className="flex-1 text-right">
                        <p className="text-sm text-muted-foreground">מחיר מוצע</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(proposal.price)}</p>
                      </div>
                      <Banknote className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <div className="flex-1 text-right">
                        <p className="text-sm text-muted-foreground">זמן ביצוע</p>
                        <p className="text-2xl font-bold">{proposal.timeline_days} ימים</p>
                      </div>
                      <Clock className="w-8 h-8 text-primary" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1 text-right">
                      <p className="text-sm text-muted-foreground text-right">תאריך הגשה</p>
                      <p className="font-medium text-right" dir="rtl">{formatDate(proposal.submitted_at)}</p>
                    </div>
                    <Calendar className="w-6 h-6 text-muted-foreground" />
                  </div>

                  {proposal.scope_text && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-right text-lg">היקף העבודה</h4>
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <p className="whitespace-pre-wrap text-right">{proposal.scope_text}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Analysis Section */}
              <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">ניתוח AI</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAiAnalysis}
                    disabled={aiAnalysisLoading}
                  >
                    {aiAnalysisLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        מנתח...
                      </>
                    ) : aiAnalysis ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        רענן ניתוח
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        ייצר ניתוח
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  {aiAnalysisLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="mr-3 text-muted-foreground">מנתח את ההצעה...</span>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                      <p className="whitespace-pre-wrap text-right leading-relaxed">{aiAnalysis}</p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>לחץ על "ייצר ניתוח" לקבלת הערכה מקצועית של ההצעה</p>
                      <p className="text-sm mt-1">הניתוח משווה את ההצעה לדרישות המקוריות</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conditions Tab */}
            <TabsContent value="conditions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-right">תנאי ההצעה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proposal.conditions_json?.payment_terms && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <h4 className="font-semibold text-lg">תנאי תשלום</h4>
                        <Banknote className="w-5 h-5 text-primary" />
                      </div>
                      <p className="bg-muted/30 p-3 rounded-lg whitespace-pre-wrap text-right">
                        {proposal.conditions_json.payment_terms}
                      </p>
                    </div>
                  )}

                  {proposal.conditions_json?.assumptions && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <h4 className="font-semibold text-lg">הנחות יסוד</h4>
                        <AlertCircle className="w-5 h-5 text-primary" />
                      </div>
                      <p className="bg-muted/30 p-3 rounded-lg whitespace-pre-wrap text-right">
                        {proposal.conditions_json.assumptions}
                      </p>
                    </div>
                  )}

                  {proposal.conditions_json?.exclusions && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <h4 className="font-semibold text-lg">לא כלול במחיר</h4>
                        <XCircle className="w-5 h-5 text-destructive" />
                      </div>
                      <p className="bg-muted/30 p-3 rounded-lg whitespace-pre-wrap text-right">
                        {proposal.conditions_json.exclusions}
                      </p>
                    </div>
                  )}

                  {proposal.conditions_json?.validity_days && (
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900 dark:text-blue-100 text-right">
                        <strong>תקופת תוקף:</strong> ההצעה תקפה ל-{proposal.conditions_json.validity_days} ימים מיום ההגשה
                      </AlertDescription>
                    </Alert>
                  )}

                  {!proposal.conditions_json?.payment_terms && 
                   !proposal.conditions_json?.assumptions && 
                   !proposal.conditions_json?.exclusions && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Shield className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <p className="text-right text-muted-foreground font-medium">
                        לא הוגדרו תנאים נוספים להצעה זו
                      </p>
                      <p className="text-sm text-muted-foreground/70 mt-1 text-right">
                        התנאים הבסיסיים מופיעים בסעיפי המחיר והזמן
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-right">קבצים מצורפים</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingFiles ? (
                    <p className="text-center text-muted-foreground py-8">טוען קבצים...</p>
                  ) : filesWithUrls.length > 0 ? (
                    <div className="space-y-4">
                      {filesWithUrls.map((file, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFile(file)}
                                disabled={!file.signedUrl}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                צפייה
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(file)}
                                disabled={!file.signedUrl}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                הורדה
                              </Button>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-medium text-right">{file.name}</p>
                                <p className="text-sm text-muted-foreground text-right">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <FileText className="w-8 h-8 text-primary" />
                            </div>
                          </div>
                          
                          {/* AI File Summary Section */}
                          <div className="border-t pt-3">
                            {fileSummaryLoading[file.name] ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>מייצר תקציר...</span>
                              </div>
                            ) : fileSummaries[file.name] ? (
                              <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium">תקציר בינה</span>
                                </div>
                                <p className="text-sm text-right">{fileSummaries[file.name]}</p>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateFileSummary(file)}
                                className="text-primary hover:text-primary/80"
                              >
                                <Sparkles className="w-4 h-4 mr-2" />
                                תקציר בינה
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <p className="text-right text-muted-foreground font-medium">
                        לא צורפו קבצים להצעה זו
                      </p>
                      <p className="text-sm text-muted-foreground/70 mt-1 text-right">
                        הספק לא העלה מסמכים נוספים
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Signature Tab */}
            <TabsContent value="signature" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-right">חתימה דיגיטלית</CardTitle>
                </CardHeader>
                <CardContent>
                  {proposal.signature_blob ? (
                    <div className="space-y-4">
                      <div className="border-2 border-primary/20 rounded-lg p-4 bg-muted/30">
                        <img
                          src={proposal.signature_blob}
                          alt="חתימה"
                          className="max-w-md mx-auto"
                        />
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h4 className="font-semibold text-green-900 dark:text-green-100 text-right">חתימה מאומתת</h4>
                        </div>
                        
                        {proposal.signature_meta_json && (
                          <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                            {proposal.signature_meta_json.signer_name && (
                              <p className="text-right">חותם: {proposal.signature_meta_json.signer_name}</p>
                            )}
                            {proposal.signature_meta_json.signer_email && (
                              <p className="text-right">דוא"ל: {proposal.signature_meta_json.signer_email}</p>
                            )}
                            {proposal.signature_meta_json.timestamp && (
                              <p className="text-right">תאריך חתימה: {formatDate(proposal.signature_meta_json.timestamp)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileSignature className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <p className="text-center text-muted-foreground font-medium">
                        אין חתימה דיגיטלית להצעה זו
                      </p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        הספק לא חתם על ההצעה באופן דיגיטלי
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-right">פעולות על ההצעה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900 dark:text-amber-100 text-right">
                      <strong>שים לב:</strong> לאחר אישור או דחיית ההצעה, לא ניתן לשנות את ההחלטה. הספק יקבל הודעה אוטומטית על ההחלטה.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    {/* Primary Action - Approve */}
                    <Button
                      size="lg"
                      onClick={() => setApprovalDialogOpen(true)}
                      className="w-full h-auto py-6 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                    >
                      <div className="flex items-center gap-3 w-full justify-center">
                        <div className="text-right">
                          <p className="font-bold text-lg text-right">אישור ההצעה</p>
                          <p className="text-sm opacity-90 text-right">בחר ספק זה ולהמשיך לחוזה</p>
                        </div>
                        <CheckCircle className="w-6 h-6" />
                      </div>
                    </Button>

                    {/* Secondary Action - Reject */}
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleReject}
                      disabled={rejectLoading}
                      className="w-full h-auto py-4 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-950"
                    >
                      <div className="flex items-center gap-3 w-full justify-center">
                        <div className="text-right">
                          <p className="font-bold text-red-700 dark:text-red-400 text-right">דחיית ההצעה</p>
                          <p className="text-xs text-red-600 dark:text-red-500 text-right">הצעה זו אינה מתאימה</p>
                        </div>
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ProposalApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        proposal={{
          id: proposal.id,
          project_id: proposal.project_id,
          advisor_id: proposal.advisor_id,
          supplier_name: proposal.supplier_name,
          price: proposal.price,
          timeline_days: proposal.timeline_days,
          scope_text: proposal.scope_text,
          conditions_json: proposal.conditions_json,
          files: proposal.files,
          signature_blob: proposal.signature_blob,
          submitted_at: proposal.submitted_at,
        }}
        onSuccess={() => {
          setApprovalDialogOpen(false);
          onOpenChange(false);
          onSuccess?.();
        }}
      />
    </>
  );
};

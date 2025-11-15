import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProposalApprovalDialog } from '@/components/ProposalApprovalDialog';
import { getProposalFilesSignedUrls } from '@/utils/storageUtils';
import { useToast } from '@/hooks/use-toast';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  Download, 
  CheckCircle, 
  XCircle, 
  FileSignature, 
  AlertCircle,
  Calendar,
  Shield
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
  const { toast } = useToast();
  const { rejectProposal, loading: rejectLoading } = useProposalApproval();

  useEffect(() => {
    if (open && proposal.files && proposal.files.length > 0) {
      loadSignedUrls();
    }
  }, [open, proposal.id]);

  const loadSignedUrls = async () => {
    setLoadingFiles(true);
    try {
      const files = proposal.files || [];
      const fileNames = files.map(f => f.name);
      const signedUrlsMap = await getProposalFilesSignedUrls(proposal.id, fileNames, 3600);
      
      const filesWithSignedUrls = files.map(file => ({
        ...file,
        signedUrl: signedUrlsMap.get(file.name),
      }));
      
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
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">
                הצעת מחיר - {proposal.supplier_name}
              </DialogTitle>
              {getStatusBadge(proposal.status)}
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">
                <FileText className="w-4 h-4 mr-2" />
                פרטים
              </TabsTrigger>
              <TabsTrigger value="conditions">
                <Shield className="w-4 h-4 mr-2" />
                תנאים
              </TabsTrigger>
              <TabsTrigger value="files">
                <Download className="w-4 h-4 mr-2" />
                קבצים ({proposal.files?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="signature">
                <FileSignature className="w-4 h-4 mr-2" />
                חתימה
              </TabsTrigger>
              <TabsTrigger value="actions" disabled={proposal.status !== 'submitted'}>
                <CheckCircle className="w-4 h-4 mr-2" />
                פעולות
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">סיכום ההצעה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <DollarSign className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">מחיר מוצע</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(proposal.price)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Clock className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">זמן ביצוע</p>
                        <p className="text-2xl font-bold">{proposal.timeline_days} ימים</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Calendar className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">תאריך הגשה</p>
                      <p className="font-medium">{formatDate(proposal.submitted_at)}</p>
                    </div>
                  </div>

                  {proposal.scope_text && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">היקף העבודה</h4>
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <p className="whitespace-pre-wrap">{proposal.scope_text}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conditions Tab */}
            <TabsContent value="conditions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">תנאי ההצעה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proposal.conditions_json?.payment_terms && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        תנאי תשלום
                      </h4>
                      <p className="bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                        {proposal.conditions_json.payment_terms}
                      </p>
                    </div>
                  )}

                  {proposal.conditions_json?.assumptions && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        הנחות יסוד
                      </h4>
                      <p className="bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                        {proposal.conditions_json.assumptions}
                      </p>
                    </div>
                  )}

                  {proposal.conditions_json?.exclusions && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        לא כלול במחיר
                      </h4>
                      <p className="bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                        {proposal.conditions_json.exclusions}
                      </p>
                    </div>
                  )}

                  {proposal.conditions_json?.validity_days && (
                    <Alert>
                      <Calendar className="h-4 w-4" />
                      <AlertDescription>
                        ההצעה תקפה למשך {proposal.conditions_json.validity_days} ימים מיום ההגשה
                      </AlertDescription>
                    </Alert>
                  )}

                  {!proposal.conditions_json?.payment_terms && 
                   !proposal.conditions_json?.assumptions && 
                   !proposal.conditions_json?.exclusions && (
                    <p className="text-center text-muted-foreground py-8">
                      לא צוינו תנאים מיוחדים להצעה זו
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">קבצים מצורפים</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingFiles ? (
                    <p className="text-center text-muted-foreground py-8">טוען קבצים...</p>
                  ) : filesWithUrls.length > 0 ? (
                    <div className="space-y-2">
                      {filesWithUrls.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary" />
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
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
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      לא צורפו קבצים להצעה זו
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Signature Tab */}
            <TabsContent value="signature" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">חתימה דיגיטלית</CardTitle>
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
                          <h4 className="font-semibold text-green-900 dark:text-green-100">חתימה מאומתת</h4>
                        </div>
                        
                        {proposal.signature_meta_json && (
                          <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                            {proposal.signature_meta_json.signer_name && (
                              <p>חותם: {proposal.signature_meta_json.signer_name}</p>
                            )}
                            {proposal.signature_meta_json.signer_email && (
                              <p>דוא"ל: {proposal.signature_meta_json.signer_email}</p>
                            )}
                            {proposal.signature_meta_json.timestamp && (
                              <p>תאריך חתימה: {formatDate(proposal.signature_meta_json.timestamp)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      אין חתימה דיגיטלית להצעה זו
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">פעולות על ההצעה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      פעולות אלו הן סופיות ולא ניתן לבטל אותן. אנא ודא את בחירתך לפני המשך.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      size="lg"
                      onClick={() => setApprovalDialogOpen(true)}
                      className="h-auto py-6"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <div className="text-right">
                        <p className="font-bold">אישור ההצעה</p>
                        <p className="text-xs opacity-90">בחר ספק זה לפרויקט</p>
                      </div>
                    </Button>

                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={handleReject}
                      disabled={rejectLoading}
                      className="h-auto py-6"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      <div className="text-right">
                        <p className="font-bold">דחיית ההצעה</p>
                        <p className="text-xs opacity-90">הצעה זו אינה מתאימה</p>
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

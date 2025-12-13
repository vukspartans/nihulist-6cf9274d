import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProposalApprovalDialog } from '@/components/ProposalApprovalDialog';
import { AIAnalysisDisplay } from '@/components/AIAnalysisDisplay';
import { useToast } from '@/hooks/use-toast';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
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
  Loader2,
  Building2,
  MapPin,
  Star,
  Globe,
  Linkedin,
  Users,
  Target,
  FolderDown
} from 'lucide-react';

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface AdvisorInfo {
  id: string;
  company_name: string | null;
  logo_url: string | null;
  expertise: string[] | null;
  rating: number | null;
  location: string | null;
  founding_year: number | null;
  office_size: string | null;
  website: string | null;
  linkedin_url: string | null;
}

interface RfpInviteContext {
  advisor_type: string | null;
  request_title: string | null;
  deadline_at: string | null;
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
    // Cached AI analysis fields
    ai_analysis?: string | null;
    ai_analysis_generated_at?: string | null;
    file_summaries?: Record<string, string> | null;
    // Advisor info
    advisors?: AdvisorInfo;
    // RFP invite context
    rfp_invite?: RfpInviteContext;
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

  // Load cached AI data when dialog opens
  useEffect(() => {
    if (open) {
      // Load cached AI analysis if available
      if (proposal.ai_analysis) {
        setAiAnalysis(proposal.ai_analysis);
      }
      // Load cached file summaries if available
      if (proposal.file_summaries && typeof proposal.file_summaries === 'object') {
        setFileSummaries(proposal.file_summaries);
      }
      // Load signed URLs for files
      if (proposal.files && proposal.files.length > 0) {
        loadSignedUrls();
      }
    } else {
      // Reset state when dialog closes
      setAiAnalysis(null);
      setFileSummaries({});
    }
  }, [open, proposal.id, proposal.ai_analysis, proposal.file_summaries]);

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
  const generateAiAnalysis = async (forceRefresh = false) => {
    // If cached and not forcing refresh, use cached version
    if (!forceRefresh && aiAnalysis) {
      return;
    }

    setAiAnalysisLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-proposal', {
        body: { proposalId: proposal.id, forceRefresh }
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

  const generateFileSummary = async (file: UploadedFile, forceRefresh = false) => {
    // If cached and not forcing refresh, use cached version
    if (!forceRefresh && fileSummaries[file.name]) {
      return;
    }

    setFileSummaryLoading(prev => ({ ...prev, [file.name]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('analyze-proposal-file', {
        body: { 
          proposalId: proposal.id,
          fileName: file.name,
          fileUrl: file.url,
          forceRefresh
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

  const handleDownloadAll = async () => {
    if (filesWithUrls.length === 0) return;
    
    const zip = new JSZip();
    let downloadedCount = 0;
    
    toast({ title: 'מכין הורדה...', description: 'אנא המתן' });
    
    for (const file of filesWithUrls) {
      if (!file.signedUrl) continue;
      try {
        const response = await fetch(file.signedUrl);
        const blob = await response.blob();
        zip.file(file.name, blob);
        downloadedCount++;
      } catch (error) {
        console.error('[ProposalDetail] Download error for:', file.name, error);
      }
    }
    
    if (downloadedCount > 0) {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal_files_${proposal.supplier_name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: 'הקבצים הורדו בהצלחה' });
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '🖼️';
    if (['dwg', 'dxf'].includes(ext || '')) return '📐';
    return '📎';
  };

  const advisor = proposal.advisors;
  const rfpContext = proposal.rfp_invite;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="border-b pb-2">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg font-bold text-right">
                הצעת מחיר - {proposal.supplier_name}
              </DialogTitle>
              {getStatusBadge(proposal.status)}
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3" dir="rtl">
            <TabsList className="w-full flex flex-row-reverse justify-end overflow-x-auto md:grid md:grid-cols-5 h-9" dir="rtl">
              <TabsTrigger value="details" className="flex-row-reverse gap-1.5 text-xs px-2">
                <FileText className="w-3.5 h-3.5" />
                פרטים
              </TabsTrigger>
              <TabsTrigger value="conditions" className="flex-row-reverse gap-1.5 text-xs px-2">
                <Shield className="w-3.5 h-3.5" />
                תנאים
              </TabsTrigger>
              <TabsTrigger value="files" className="flex-row-reverse gap-1.5 text-xs px-2">
                <Download className="w-3.5 h-3.5" />
                קבצים ({proposal.files?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="signature" className="flex-row-reverse gap-1.5 text-xs px-2">
                <FileSignature className="w-3.5 h-3.5" />
                חתימה
              </TabsTrigger>
              <TabsTrigger value="actions" disabled={proposal.status !== 'submitted'} className="flex-row-reverse gap-1.5 text-xs px-2">
                <CheckCircle className="w-3.5 h-3.5" />
                פעולות
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-3 mt-3" dir="rtl">
              {/* Advisor Info Section */}
              {advisor && (
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <div className="flex items-start gap-3 flex-row-reverse">
                    {/* Logo */}
                    {advisor.logo_url ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border flex-shrink-0">
                        <img 
                          src={advisor.logo_url}
                          alt={advisor.company_name || proposal.supplier_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 border">
                        <span className="text-xl font-bold text-primary">
                          {(advisor.company_name || proposal.supplier_name).charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    {/* Info */}
                    <div className="flex-1 text-right">
                      <div className="flex items-center gap-2 flex-row-reverse justify-start mb-1">
                        <h4 className="font-bold text-base">{advisor.company_name || proposal.supplier_name}</h4>
                        {advisor.rating && (
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{advisor.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Meta row */}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mb-2 flex-row-reverse">
                        {advisor.location && (
                          <span className="flex items-center gap-1 flex-row-reverse">
                            <MapPin className="w-3 h-3" />
                            {advisor.location}
                          </span>
                        )}
                        {advisor.founding_year && (
                          <span className="flex items-center gap-1 flex-row-reverse">
                            <Calendar className="w-3 h-3" />
                            מאז {advisor.founding_year}
                          </span>
                        )}
                        {advisor.office_size && (
                          <span className="flex items-center gap-1 flex-row-reverse">
                            <Users className="w-3 h-3" />
                            {advisor.office_size}
                          </span>
                        )}
                      </div>
                      
                      {/* Expertise badges */}
                      {advisor.expertise && advisor.expertise.length > 0 && (
                        <div className="flex gap-1 flex-wrap flex-row-reverse mb-2">
                          {advisor.expertise.slice(0, 3).map((exp, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {exp}
                            </Badge>
                          ))}
                          {advisor.expertise.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{advisor.expertise.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Links */}
                      <div className="flex gap-2 flex-row-reverse">
                        {advisor.website && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a href={advisor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                  <Globe className="w-4 h-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>אתר אינטרנט</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {advisor.linkedin_url && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a href={advisor.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                  <Linkedin className="w-4 h-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>לינקדאין</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RFP Context */}
              {rfpContext && (rfpContext.advisor_type || rfpContext.request_title) && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 flex-row-reverse text-sm">
                    <Target className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap flex-row-reverse text-right">
                      <span className="text-blue-900 dark:text-blue-100">הגשה עבור:</span>
                      <span className="font-semibold text-blue-900 dark:text-blue-100">
                        {rfpContext.advisor_type}
                        {rfpContext.request_title && ` - ${rfpContext.request_title}`}
                      </span>
                      {rfpContext.deadline_at && (
                        <span className="text-blue-700 dark:text-blue-300 text-xs">
                          (דדליין: {new Date(rfpContext.deadline_at).toLocaleDateString('he-IL')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Summary Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg flex-row-reverse">
                  <Banknote className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 text-right min-w-0">
                    <p className="text-xs text-muted-foreground">מחיר</p>
                    <p className="text-base font-bold text-primary truncate">{formatCurrency(proposal.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg flex-row-reverse">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 text-right min-w-0">
                    <p className="text-xs text-muted-foreground">ביצוע</p>
                    <p className="text-base font-bold">{proposal.timeline_days} ימים</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg flex-row-reverse">
                  <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 text-right min-w-0">
                    <p className="text-xs text-muted-foreground">הוגש</p>
                    <p className="text-sm font-medium truncate">{new Date(proposal.submitted_at).toLocaleDateString('he-IL')}</p>
                  </div>
                </div>
              </div>

              {proposal.scope_text && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-right text-sm">היקף העבודה</h4>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="whitespace-pre-wrap text-right text-sm">{proposal.scope_text}</p>
                  </div>
                </div>
              )}

              {/* AI Analysis Section - Streamlined */}
              <div className="border-t pt-3" dir="rtl">
                <div className="flex items-center justify-between mb-2 flex-row-reverse">
                  <div className="flex items-center gap-1.5 flex-row-reverse">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">ניתוח AI</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateAiAnalysis(!!aiAnalysis)}
                    disabled={aiAnalysisLoading}
                    className="h-7 px-2 text-xs"
                  >
                    {aiAnalysisLoading ? (
                      <><Loader2 className="w-3 h-3 ml-1 animate-spin" />מנתח...</>
                    ) : aiAnalysis ? (
                      <><RefreshCw className="w-3 h-3 ml-1" />רענן</>
                    ) : (
                      <><Sparkles className="w-3 h-3 ml-1" />ייצר ניתוח</>
                    )}
                  </Button>
                </div>
                
                {aiAnalysisLoading ? (
                  <div className="flex items-center justify-center py-4 flex-row-reverse">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="mr-2 text-sm text-muted-foreground">מנתח את ההצעה...</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/10" dir="rtl">
                    <AIAnalysisDisplay content={aiAnalysis} />
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">לחץ על "ייצר ניתוח" לקבלת הערכה מקצועית</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Conditions Tab */}
            <TabsContent value="conditions" className="space-y-3 mt-3" dir="rtl">
              <div className="space-y-3">
                {proposal.conditions_json?.payment_terms && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      <h4 className="font-semibold text-sm">תנאי תשלום</h4>
                      <Banknote className="w-4 h-4 text-primary" />
                    </div>
                    <p className="bg-muted/30 p-2.5 rounded-lg whitespace-pre-wrap text-right text-sm">
                      {proposal.conditions_json.payment_terms}
                    </p>
                  </div>
                )}

                {proposal.conditions_json?.assumptions && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      <h4 className="font-semibold text-sm">הנחות יסוד</h4>
                      <AlertCircle className="w-4 h-4 text-primary" />
                    </div>
                    <p className="bg-muted/30 p-2.5 rounded-lg whitespace-pre-wrap text-right text-sm">
                      {proposal.conditions_json.assumptions}
                    </p>
                  </div>
                )}

                {proposal.conditions_json?.exclusions && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      <h4 className="font-semibold text-sm">לא כלול במחיר</h4>
                      <XCircle className="w-4 h-4 text-destructive" />
                    </div>
                    <p className="bg-muted/30 p-2.5 rounded-lg whitespace-pre-wrap text-right text-sm">
                      {proposal.conditions_json.exclusions}
                    </p>
                  </div>
                )}

                {proposal.conditions_json?.validity_days && (
                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 py-2">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <AlertDescription className="text-blue-900 dark:text-blue-100 text-right text-sm">
                      <strong>תקופת תוקף:</strong> ההצעה תקפה ל-{proposal.conditions_json.validity_days} ימים
                    </AlertDescription>
                  </Alert>
                )}

                {!proposal.conditions_json?.payment_terms && 
                 !proposal.conditions_json?.assumptions && 
                 !proposal.conditions_json?.exclusions && (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Shield className="w-10 h-10 text-muted-foreground/50 mb-2" />
                    <p className="text-right text-muted-foreground text-sm">לא הוגדרו תנאים נוספים להצעה זו</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-3 mt-3" dir="rtl">
              {loadingFiles ? (
                <p className="text-center text-muted-foreground py-6 text-sm">טוען קבצים...</p>
              ) : filesWithUrls.length > 0 ? (
                <div className="space-y-2">
                  {/* Download All button */}
                  {filesWithUrls.length >= 2 && (
                    <div className="flex justify-start mb-2">
                      <Button variant="outline" size="sm" onClick={handleDownloadAll} className="h-8 text-xs flex-row-reverse">
                        <FolderDown className="w-4 h-4 ml-1.5" />
                        הורד הכל ({filesWithUrls.length} קבצים)
                      </Button>
                    </div>
                  )}
                  
                  {filesWithUrls.map((file, index) => (
                    <div key={index} className="border rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <span className="text-xl">{getFileIcon(file.name)}</span>
                          <div className="text-right">
                            <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => handleViewFile(file)} disabled={!file.signedUrl} className="h-7 w-7 p-0">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>צפייה</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => handleDownload(file)} disabled={!file.signedUrl} className="h-7 w-7 p-0">
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>הורדה</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      {/* AI File Summary */}
                      <div className="border-t pt-2" dir="rtl">
                        {fileSummaryLoading[file.name] ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs flex-row-reverse justify-end">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>מייצר תקציר...</span>
                          </div>
                        ) : fileSummaries[file.name] ? (
                          <div className="bg-primary/5 p-2 rounded border border-primary/10">
                            <div className="flex items-center justify-between mb-1 flex-row-reverse">
                              <div className="flex items-center gap-1 flex-row-reverse">
                                <Sparkles className="w-3 h-3 text-primary" />
                                <span className="text-xs font-medium">תקציר בינה</span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => generateFileSummary(file, true)} className="h-5 px-1.5">
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            </div>
                            <div dir="rtl">
                              <AIAnalysisDisplay content={fileSummaries[file.name]} className="text-xs" />
                            </div>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => generateFileSummary(file, false)} className="text-primary hover:text-primary/80 h-6 text-xs flex-row-reverse">
                            <Sparkles className="w-3 h-3 ml-1" />תקציר בינה
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <FileText className="w-10 h-10 text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">לא צורפו קבצים להצעה זו</p>
                </div>
              )}
            </TabsContent>

            {/* Signature Tab */}
            <TabsContent value="signature" className="space-y-3 mt-3" dir="rtl">
              {proposal.signature_blob ? (
                <div className="space-y-3">
                  <div className="border-2 border-primary/20 rounded-lg p-3 bg-muted/30">
                    <img src={proposal.signature_blob} alt="חתימה" className="max-w-xs mx-auto" />
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-row-reverse justify-start">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 text-sm">חתימה מאומתת</h4>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    
                    {proposal.signature_meta_json && (
                      <div className="space-y-0.5 text-xs text-green-800 dark:text-green-200">
                        {proposal.signature_meta_json.signer_name && <p className="text-right">חותם: {proposal.signature_meta_json.signer_name}</p>}
                        {proposal.signature_meta_json.signer_email && <p className="text-right">דוא"ל: {proposal.signature_meta_json.signer_email}</p>}
                        {proposal.signature_meta_json.timestamp && <p className="text-right">תאריך: {formatDate(proposal.signature_meta_json.timestamp)}</p>}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <FileSignature className="w-10 h-10 text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">אין חתימה דיגיטלית להצעה זו</p>
                </div>
              )}
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-3 mt-3" dir="rtl">
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-100 text-right text-sm">
                  <strong>שים לב:</strong> לאחר אישור או דחייה, לא ניתן לשנות את ההחלטה.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="lg"
                  onClick={() => setApprovalDialogOpen(true)}
                  className="h-auto py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                >
                  <div className="flex items-center gap-2 justify-center">
                    <CheckCircle className="w-5 h-5" />
                    <div className="text-right">
                      <p className="font-bold text-sm">אישור ההצעה</p>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleReject}
                  disabled={rejectLoading}
                  className="h-auto py-3 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-950"
                >
                  <div className="flex items-center gap-2 justify-center">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div className="text-right">
                      <p className="font-bold text-red-700 dark:text-red-400 text-sm">דחיית ההצעה</p>
                    </div>
                  </div>
                </Button>
              </div>
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

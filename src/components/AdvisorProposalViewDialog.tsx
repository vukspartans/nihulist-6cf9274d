import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Home, List, Coins, CreditCard, FileText, Clock, Calendar, Download,
  CheckCircle, XCircle, AlertCircle, Eye, Loader2, MapPin, Building2,
  FileImage, FileSpreadsheet, File, FolderDown, Banknote
} from 'lucide-react';

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface AdvisorProposalViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
}

interface ProposalData {
  id: string;
  price: number;
  timeline_days: number;
  currency?: string;
  scope_text?: string;
  conditions_json?: {
    payment_terms?: string;
    assumptions?: string;
    exclusions?: string;
    validity_days?: number;
    milestones?: Array<{ description: string; percentage: number }>;
    payment_term_type?: string;
    notes?: string;
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
  projects?: {
    id: string;
    name: string;
    type: string;
    location: string;
  };
}

export function AdvisorProposalViewDialog({ open, onOpenChange, proposalId }: AdvisorProposalViewDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('main');
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);

  useEffect(() => {
    if (open && proposalId) {
      fetchProposal();
    }
  }, [open, proposalId]);

  const fetchProposal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id, price, timeline_days, currency, scope_text, conditions_json,
          files, signature_blob, signature_meta_json, status, submitted_at,
          projects!proposals_project_id_fkey (id, name, type, location)
        `)
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      
      // Cast the data properly
      const proposalData: ProposalData = {
        ...data,
        files: (data.files as unknown as UploadedFile[]) || [],
        conditions_json: data.conditions_json as ProposalData['conditions_json'],
        signature_meta_json: data.signature_meta_json as ProposalData['signature_meta_json'],
      };
      setProposal(proposalData);

      // Load file URLs if files exist
      if (proposalData.files && proposalData.files.length > 0) {
        await loadSignedUrls(proposalData.files);
      }
    } catch (error) {
      console.error('Error fetching proposal:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את פרטי ההצעה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSignedUrls = async (files: UploadedFile[]) => {
    setLoadingUrls(true);
    const urls: Record<string, string> = {};
    for (const file of files) {
      try {
        const filePath = file.url.replace(/^.*\/proposal-files\//, '');
        const { data } = await supabase.storage.from('proposal-files').createSignedUrl(filePath, 3600);
        if (data?.signedUrl) urls[file.name] = data.signedUrl;
      } catch {}
    }
    setFileUrls(urls);
    setLoadingUrls(false);
  };

  const handleViewFile = async (file: UploadedFile) => {
    const url = fileUrls[file.name];
    if (!url) {
      toast({ title: "שגיאה", description: "לא ניתן לטעון את הקובץ", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      toast({ title: "שגיאה", description: "לא ניתן לפתוח את הקובץ", variant: "destructive" });
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    const url = fileUrls[file.name];
    if (!url) {
      toast({ title: "שגיאה", description: "לא ניתן להוריד את הקובץ", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "שגיאה", description: "לא ניתן להוריד את הקובץ", variant: "destructive" });
    }
  };

  const handleDownloadAll = async () => {
    if (!proposal?.files || proposal.files.length === 0) return;
    try {
      const zip = new JSZip();
      for (const file of proposal.files) {
        const url = fileUrls[file.name];
        if (url) {
          const res = await fetch(url);
          zip.file(file.name, await res.blob());
        }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `proposal_files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast({ title: "הורדה הושלמה" });
    } catch {
      toast({ title: "שגיאה", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: proposal?.currency || 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (d: string) => format(new Date(d), "dd/MM/yyyy", { locale: he });

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return FileImage;
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return FileSpreadsheet;
    if (ext === 'pdf') return FileText;
    return File;
  };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      submitted: { label: "הוגש", variant: "default", icon: CheckCircle },
      accepted: { label: "אושר", variant: "default", icon: CheckCircle },
      rejected: { label: "נדחה", variant: "destructive", icon: XCircle },
      under_review: { label: "בבדיקה", variant: "secondary", icon: AlertCircle },
      draft: { label: "טיוטה", variant: "outline", icon: FileText },
      withdrawn: { label: "בוטל", variant: "outline", icon: XCircle },
      negotiation_requested: { label: "משא ומתן", variant: "secondary", icon: AlertCircle },
      resubmitted: { label: "הוגש מחדש", variant: "default", icon: CheckCircle },
    };
    const c = cfg[status] || cfg.draft;
    const Icon = c.icon;
    return <Badge variant={c.variant} className="gap-1"><Icon className="w-3 h-3" />{c.label}</Badge>;
  };

  const conditions = proposal?.conditions_json || {};
  const files = proposal?.files || [];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!proposal) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <div className="text-center p-8 text-muted-foreground">
            לא נמצאה הצעה
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0" dir="rtl">
          <DialogHeader className="p-4 pb-3 border-b">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-lg font-bold text-right">
                ההצעה שהגשתי - {proposal.projects?.name || 'פרויקט'}
              </DialogTitle>
              {getStatusBadge(proposal.status)}
            </div>
            {proposal.projects && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>{proposal.projects.type}</span>
                <span>•</span>
                <MapPin className="h-3 w-3" />
                <span>{proposal.projects.location}</span>
              </div>
            )}
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full flex flex-row-reverse justify-start rounded-none border-b bg-transparent px-4">
              <TabsTrigger value="main" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1.5">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">ראשי</span>
              </TabsTrigger>
              <TabsTrigger value="conditions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1.5">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">תנאים</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">קבצים</span>
                {files.length > 0 && <Badge variant="secondary" className="text-xs">{files.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="signature" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">חתימה</span>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-180px)]">
              {/* Tab 1: Main Details */}
              <TabsContent value="main" className="p-4 space-y-4 m-0">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Calendar className="w-5 h-5 mx-auto mb-1.5 text-purple-600" />
                      <p className="text-xs text-muted-foreground">תאריך הגשה</p>
                      <p className="font-bold text-sm">{formatDate(proposal.submitted_at)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Clock className="w-5 h-5 mx-auto mb-1.5 text-blue-600" />
                      <p className="text-xs text-muted-foreground">לו״ז ביצוע</p>
                      <p className="font-bold text-sm">{proposal.timeline_days} ימים</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-3 text-center">
                      <Banknote className="w-5 h-5 mx-auto mb-1.5 text-green-600" />
                      <p className="text-xs text-muted-foreground">מחיר שהוצע</p>
                      <p className="font-bold text-sm text-green-700">{formatCurrency(proposal.price)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Scope of Work */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 justify-end text-right">
                      היקף העבודה
                      <Building2 className="h-4 w-4" />
                    </h4>
                    {proposal.scope_text ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-right">{proposal.scope_text}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground text-right">לא צוין היקף עבודה</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Conditions */}
              <TabsContent value="conditions" className="p-4 space-y-4 m-0">
                {/* Payment Terms */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 justify-end text-right">
                      תנאי תשלום
                      <CreditCard className="h-4 w-4" />
                    </h4>
                    {conditions.payment_terms ? (
                      <p className="text-sm whitespace-pre-wrap text-right">{conditions.payment_terms}</p>
                    ) : conditions.payment_term_type ? (
                      <p className="text-sm text-right">{conditions.payment_term_type}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground text-right">לא צוינו תנאי תשלום</p>
                    )}
                  </CardContent>
                </Card>

                {/* Milestones */}
                {conditions.milestones && conditions.milestones.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 justify-end text-right">
                        אבני דרך לתשלום
                        <Coins className="h-4 w-4" />
                      </h4>
                      <div className="space-y-2">
                        {conditions.milestones.map((milestone, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                            <Badge variant="outline">{milestone.percentage}%</Badge>
                            <span>{milestone.description}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Assumptions */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 justify-end text-right">
                      הנחות יסוד
                      <List className="h-4 w-4" />
                    </h4>
                    {conditions.assumptions ? (
                      <p className="text-sm whitespace-pre-wrap text-right">{conditions.assumptions}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground text-right">לא צוינו הנחות יסוד</p>
                    )}
                  </CardContent>
                </Card>

                {/* Exclusions */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 justify-end text-right">
                      לא כלול בהצעה
                      <XCircle className="h-4 w-4" />
                    </h4>
                    {conditions.exclusions ? (
                      <p className="text-sm whitespace-pre-wrap text-right">{conditions.exclusions}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground text-right">לא צוינו אי-הכללות</p>
                    )}
                  </CardContent>
                </Card>

                {/* Validity */}
                {conditions.validity_days && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 justify-end text-right">
                        תוקף ההצעה
                        <Calendar className="h-4 w-4" />
                      </h4>
                      <p className="text-sm text-right">{conditions.validity_days} ימים מתאריך ההגשה</p>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {conditions.notes && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 justify-end text-right">
                        הערות נוספות
                        <FileText className="h-4 w-4" />
                      </h4>
                      <p className="text-sm whitespace-pre-wrap text-right">{conditions.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 3: Files */}
              <TabsContent value="files" className="p-4 space-y-4 m-0">
                {files.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>לא צורפו קבצים להצעה זו</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {files.length > 1 && (
                      <Button variant="outline" size="sm" onClick={handleDownloadAll} className="w-full sm:w-auto">
                        <FolderDown className="h-4 w-4 me-2" />
                        הורד את כל הקבצים
                      </Button>
                    )}
                    <div className="space-y-2">
                      {files.map((file, idx) => {
                        const FileIcon = getFileIcon(file.name);
                        return (
                          <Card key={idx}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleViewFile(file)} disabled={loadingUrls}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>צפייה</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleDownload(file)} disabled={loadingUrls}>
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>הורדה</TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="flex items-center gap-2 flex-1 justify-end">
                                  <div className="text-right">
                                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                  <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Tab 4: Signature */}
              <TabsContent value="signature" className="p-4 space-y-4 m-0">
                {proposal.signature_blob ? (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 justify-end text-right">
                        חתימה דיגיטלית
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </h4>
                      <div className="flex flex-col items-center gap-4">
                        <div className="border rounded-lg p-4 bg-white">
                          <img
                            src={proposal.signature_blob}
                            alt="חתימה"
                            className="max-h-24 object-contain"
                          />
                        </div>
                        {proposal.signature_meta_json && (
                          <div className="text-sm text-muted-foreground space-y-1 text-center">
                            {proposal.signature_meta_json.signer_name && (
                              <p>חתום ע״י: {proposal.signature_meta_json.signer_name}</p>
                            )}
                            {proposal.signature_meta_json.timestamp && (
                              <p>בתאריך: {formatDate(proposal.signature_meta_json.timestamp)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>לא נמצאה חתימה להצעה זו</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

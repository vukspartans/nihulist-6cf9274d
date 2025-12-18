import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Home, List, FileText, Clock, Calendar, Download,
  CheckCircle, XCircle, AlertCircle, Eye, Loader2, MapPin, Building2,
  FileImage, FileSpreadsheet, File, FolderDown, Banknote, CreditCard, Coins
} from 'lucide-react';

// Reusable section header component
const SectionHeader = ({ icon: Icon, children, className = "" }: { 
  icon: React.ElementType; 
  children: React.ReactNode; 
  className?: string 
}) => (
  <h4 className={`flex items-center gap-2 font-semibold justify-end text-right text-xs ${className}`}>
    {children}
    <Icon className="w-4 h-4" />
  </h4>
);

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
      
      const proposalData: ProposalData = {
        ...data,
        files: (data.files as unknown as UploadedFile[]) || [],
        conditions_json: data.conditions_json as ProposalData['conditions_json'],
        signature_meta_json: data.signature_meta_json as ProposalData['signature_meta_json'],
      };
      setProposal(proposalData);

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

  const getStatusConfig = (status: string) => {
    const cfg: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; bannerClass: string; bannerText: string }> = {
      submitted: { label: "הוגש", variant: "default", icon: CheckCircle, bannerClass: "bg-blue-50 border-blue-200 text-blue-700", bannerText: "הצעתך הוגשה בהצלחה ומחכה לבדיקת היזם" },
      accepted: { label: "אושר", variant: "default", icon: CheckCircle, bannerClass: "bg-green-50 border-green-200 text-green-700", bannerText: "🎉 הצעתך אושרה!" },
      rejected: { label: "נדחה", variant: "destructive", icon: XCircle, bannerClass: "bg-red-50 border-red-200 text-red-700", bannerText: "הצעתך נדחתה" },
      under_review: { label: "בבדיקה", variant: "secondary", icon: AlertCircle, bannerClass: "bg-yellow-50 border-yellow-200 text-yellow-700", bannerText: "הצעתך נמצאת בבדיקה" },
      draft: { label: "טיוטה", variant: "outline", icon: FileText, bannerClass: "bg-gray-50 border-gray-200 text-gray-700", bannerText: "טיוטה" },
      withdrawn: { label: "בוטל", variant: "outline", icon: XCircle, bannerClass: "bg-gray-50 border-gray-200 text-gray-700", bannerText: "ההצעה בוטלה" },
      negotiation_requested: { label: "משא ומתן", variant: "secondary", icon: AlertCircle, bannerClass: "bg-orange-50 border-orange-200 text-orange-700", bannerText: "היזם ביקש משא ומתן על ההצעה" },
      resubmitted: { label: "הוגש מחדש", variant: "default", icon: CheckCircle, bannerClass: "bg-blue-50 border-blue-200 text-blue-700", bannerText: "ההצעה הוגשה מחדש ומחכה לבדיקה" },
    };
    return cfg[status] || cfg.draft;
  };

  const conditions = proposal?.conditions_json || {};
  const files = proposal?.files || [];
  const hasConditions = conditions.payment_terms || conditions.payment_term_type || 
    (conditions.milestones && conditions.milestones.length > 0) || 
    conditions.assumptions || conditions.exclusions || 
    conditions.validity_days || conditions.notes;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!proposal) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <div className="text-center p-6 text-muted-foreground text-sm">
            לא נמצאה הצעה
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const statusConfig = getStatusConfig(proposal.status);
  const StatusIcon = statusConfig.icon;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0" dir="rtl">
          {/* Header */}
          <DialogHeader className="p-3 pb-2 border-b">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-sm font-bold text-right truncate">
                {proposal.projects?.name || 'פרויקט'}
              </DialogTitle>
              <Badge variant={statusConfig.variant} className="gap-1 text-xs shrink-0">
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </Badge>
            </div>
            {proposal.projects && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{proposal.projects.type}</span>
                <span>•</span>
                <MapPin className="h-3 w-3" />
                <span>{proposal.projects.location}</span>
              </div>
            )}
          </DialogHeader>

          {/* Status Banner */}
          <div className={`px-3 py-1.5 text-xs text-right border-b ${statusConfig.bannerClass}`}>
            {statusConfig.bannerText}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full flex flex-row-reverse justify-start rounded-none border-b bg-transparent px-3 h-9">
              <TabsTrigger value="main" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1 text-xs px-2 py-1">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ראשי</span>
              </TabsTrigger>
              <TabsTrigger value="conditions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1 text-xs px-2 py-1">
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">תנאים</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1 text-xs px-2 py-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">קבצים</span>
                {files.length > 0 && <Badge variant="secondary" className="text-[10px] px-1 h-4">{files.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-160px)]">
              {/* Tab 1: Main Details + Signature */}
              <TabsContent value="main" className="p-3 space-y-3 m-0">
                {/* Compact Key Metrics Row */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="bg-muted/30">
                    <CardContent className="p-2 text-center">
                      <Calendar className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                      <p className="text-[10px] text-muted-foreground">הוגש</p>
                      <p className="font-bold text-xs">{formatDate(proposal.submitted_at)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-2 text-center">
                      <Clock className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                      <p className="text-[10px] text-muted-foreground">לו״ז</p>
                      <p className="font-bold text-xs">{proposal.timeline_days} ימים</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-2 text-center">
                      <Banknote className="w-4 h-4 mx-auto mb-1 text-green-600" />
                      <p className="text-[10px] text-muted-foreground">מחיר</p>
                      <p className="font-bold text-xs text-green-700">{formatCurrency(proposal.price)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Scope of Work */}
                <Card>
                  <CardContent className="p-3">
                    <SectionHeader icon={Building2}>היקף העבודה</SectionHeader>
                    {proposal.scope_text ? (
                      <p className="text-xs whitespace-pre-wrap leading-relaxed text-right mt-2">{proposal.scope_text}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground text-right mt-2">לא צוין</p>
                    )}
                  </CardContent>
                </Card>

                {/* Signature (merged into main tab) */}
                {proposal.signature_blob && (
                  <Card>
                    <CardContent className="p-3">
                      <SectionHeader icon={CheckCircle} className="text-green-600">חתימה דיגיטלית</SectionHeader>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="border rounded p-2 bg-white shrink-0">
                          <img
                            src={proposal.signature_blob}
                            alt="חתימה"
                            className="h-12 object-contain"
                          />
                        </div>
                        {proposal.signature_meta_json && (
                          <div className="text-xs text-muted-foreground text-right">
                            {proposal.signature_meta_json.signer_name && (
                              <p>חתום: {proposal.signature_meta_json.signer_name}</p>
                            )}
                            {proposal.signature_meta_json.timestamp && (
                              <p>{formatDate(proposal.signature_meta_json.timestamp)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 2: Consolidated Conditions */}
              <TabsContent value="conditions" className="p-3 m-0">
                {!hasConditions ? (
                  <Card>
                    <CardContent className="p-4 text-center text-muted-foreground text-xs">
                      <List className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      לא צוינו תנאים להצעה זו
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-3 space-y-3">
                      {/* Payment Terms */}
                      {(conditions.payment_terms || conditions.payment_term_type) && (
                        <div>
                          <SectionHeader icon={CreditCard}>תנאי תשלום</SectionHeader>
                          <p className="text-xs text-right mt-1">
                            {conditions.payment_terms || conditions.payment_term_type}
                          </p>
                        </div>
                      )}

                      {/* Milestones */}
                      {conditions.milestones && conditions.milestones.length > 0 && (
                        <>
                          {(conditions.payment_terms || conditions.payment_term_type) && <Separator />}
                          <div>
                            <SectionHeader icon={Coins}>אבני דרך</SectionHeader>
                            <div className="space-y-1 mt-1">
                              {conditions.milestones.map((m, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded">
                                  <Badge variant="outline" className="text-[10px] px-1.5">{m.percentage}%</Badge>
                                  <span className="text-right flex-1 mr-2">{m.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Assumptions */}
                      {conditions.assumptions && (
                        <>
                          <Separator />
                          <div>
                            <SectionHeader icon={List}>הנחות יסוד</SectionHeader>
                            <p className="text-xs whitespace-pre-wrap text-right mt-1">{conditions.assumptions}</p>
                          </div>
                        </>
                      )}

                      {/* Exclusions */}
                      {conditions.exclusions && (
                        <>
                          <Separator />
                          <div>
                            <SectionHeader icon={XCircle}>לא כלול</SectionHeader>
                            <p className="text-xs whitespace-pre-wrap text-right mt-1">{conditions.exclusions}</p>
                          </div>
                        </>
                      )}

                      {/* Validity */}
                      {conditions.validity_days && (
                        <>
                          <Separator />
                          <div>
                            <SectionHeader icon={Calendar}>תוקף ההצעה</SectionHeader>
                            <p className="text-xs text-right mt-1">{conditions.validity_days} ימים</p>
                          </div>
                        </>
                      )}

                      {/* Notes */}
                      {conditions.notes && (
                        <>
                          <Separator />
                          <div>
                            <SectionHeader icon={FileText}>הערות</SectionHeader>
                            <p className="text-xs whitespace-pre-wrap text-right mt-1">{conditions.notes}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 3: Files */}
              <TabsContent value="files" className="p-3 space-y-2 m-0">
                {files.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center text-muted-foreground text-xs">
                      <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      לא צורפו קבצים
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {files.length > 1 && (
                      <Button variant="outline" size="sm" onClick={handleDownloadAll} className="w-full text-xs h-8">
                        <FolderDown className="h-3.5 w-3.5 me-1.5" />
                        הורד הכל ({files.length})
                      </Button>
                    )}
                    <div className="space-y-1.5">
                      {files.map((file, idx) => {
                        const FileIcon = getFileIcon(file.name);
                        return (
                          <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-md">
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewFile(file)} disabled={loadingUrls}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>צפייה</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(file)} disabled={loadingUrls}>
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>הורדה</TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                              <div className="text-right min-w-0">
                                <p className="text-xs font-medium truncate">{file.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <FileIcon className="h-6 w-6 text-muted-foreground shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

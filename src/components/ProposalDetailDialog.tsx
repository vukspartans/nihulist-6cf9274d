import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProposalApprovalDialog } from '@/components/ProposalApprovalDialog';
import { AIAnalysisDisplay } from '@/components/AIAnalysisDisplay';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateProposalPDF } from '@/utils/generateProposalPDF';
import JSZip from 'jszip';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  FileText, Banknote, Clock, Download, CheckCircle, XCircle, AlertCircle, Calendar,
  Eye, Sparkles, RefreshCw, Loader2, Building2, MapPin, Star, Globe, Linkedin,
  Users, Target, FolderDown, DollarSign, Briefcase, FileCheck, Scale, FileImage, FileSpreadsheet, File, Printer, CalendarCheck
} from 'lucide-react';

interface UploadedFile { name: string; url: string; size: number; type: string; }
interface AdvisorInfo { id: string; company_name: string | null; logo_url: string | null; expertise: string[] | null; rating: number | null; location: string | null; founding_year: number | null; office_size: string | null; website: string | null; linkedin_url: string | null; }
interface RfpInviteContext { advisor_type: string | null; request_title: string | null; deadline_at: string | null; }

interface ProposalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    id: string; project_id: string; advisor_id: string; supplier_name: string; price: number; timeline_days: number; currency?: string; scope_text?: string;
    conditions_json?: { payment_terms?: string; assumptions?: string; exclusions?: string; validity_days?: number; };
    files?: UploadedFile[]; signature_blob?: string; signature_meta_json?: { timestamp?: string; signer_name?: string; signer_email?: string; stampImage?: string; };
    status: string; submitted_at: string; ai_analysis?: string | null; ai_analysis_generated_at?: string | null; file_summaries?: Record<string, string> | null;
    advisors?: AdvisorInfo; rfp_invite?: RfpInviteContext; seen_by_entrepreneur_at?: string | null;
    fee_line_items?: any[]; milestone_adjustments?: any[];
  };
  projectId?: string;
  projectName?: string;
  onStatusChange?: () => void;
  onSuccess?: () => void;
}

export function ProposalDetailDialog({ open, onOpenChange, proposal, projectId, projectName, onStatusChange, onSuccess }: ProposalDetailDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(proposal.ai_analysis || null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [fileSummaries, setFileSummaries] = useState<Record<string, string>>(proposal.file_summaries || {});
  const [generatingFileSummary, setGeneratingFileSummary] = useState<string | null>(null);

  const files = proposal.files || [];
  const conditions = proposal.conditions_json || {};
  const advisorInfo = proposal.advisors;
  const rfpContext = proposal.rfp_invite;

  // Calculate completion date
  const submissionDate = new Date(proposal.submitted_at);
  const estimatedCompletionDate = addDays(submissionDate, proposal.timeline_days);

  useEffect(() => {
    if (open && proposal.id && !proposal.seen_by_entrepreneur_at) markProposalAsSeen();
  }, [open, proposal.id]);

  useEffect(() => {
    if (open && files.length > 0) loadSignedUrls();
    if (proposal.ai_analysis) setAiAnalysis(proposal.ai_analysis);
    if (proposal.file_summaries) setFileSummaries(proposal.file_summaries);
  }, [open, proposal]);

  const markProposalAsSeen = async () => {
    try { await supabase.from('proposals').update({ seen_by_entrepreneur_at: new Date().toISOString() }).eq('id', proposal.id); } catch {}
  };

  const loadSignedUrls = async () => {
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
    if (!url) { toast({ title: "שגיאה", description: "לא ניתן לטעון את הקובץ", variant: "destructive" }); return; }
    try {
      const res = await fetch(url); const blob = await res.blob(); const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = blobUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch { toast({ title: "שגיאה", description: "לא ניתן לפתוח את הקובץ", variant: "destructive" }); }
  };

  const handleDownload = async (file: UploadedFile) => {
    const url = fileUrls[file.name];
    if (!url) { toast({ title: "שגיאה", description: "לא ניתן להוריד את הקובץ", variant: "destructive" }); return; }
    try {
      const res = await fetch(url); const blob = await res.blob(); const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = blobUrl; link.download = file.name;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(blobUrl);
    } catch { toast({ title: "שגיאה", description: "לא ניתן להוריד את הקובץ", variant: "destructive" }); }
  };

  const handleDownloadAll = async () => {
    try {
      const zip = new JSZip();
      for (const file of files) { const url = fileUrls[file.name]; if (url) { const res = await fetch(url); zip.file(file.name, await res.blob()); } }
      const content = await zip.generateAsync({ type: 'blob' }); const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a'); link.href = blobUrl; link.download = `${proposal.supplier_name}_files.zip`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(blobUrl);
      toast({ title: "הורדה הושלמה" });
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
  };

  const handleExportPDF = async () => {
    try {
      await generateProposalPDF({
        supplierName: proposal.supplier_name,
        projectName: projectName || 'פרויקט',
        price: proposal.price,
        timelineDays: proposal.timeline_days,
        submittedAt: proposal.submitted_at,
        scopeText: proposal.scope_text,
        conditions: proposal.conditions_json,
        feeItems: proposal.fee_line_items?.map((item: any) => ({
          description: item.description || item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unit_price,
          total: item.total,
          isOptional: item.is_optional,
        })),
        milestones: proposal.milestone_adjustments?.map((m: any) => ({
          description: m.description,
          percentage: m.percentage,
        })),
        signaturePng: proposal.signature_blob || undefined,
        stampImage: proposal.signature_meta_json?.stampImage,
      });
      toast({ title: "PDF נפתח להדפסה" });
    } catch {
      toast({ title: "שגיאה ביצירת PDF", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    const reason = prompt("נא להזין סיבת דחייה:"); if (!reason) return;
    try {
      await supabase.from('proposals').update({ status: 'rejected' }).eq('id', proposal.id);
      await supabase.functions.invoke('notify-proposal-rejected', { body: { proposalId: proposal.id, reason } });
      toast({ title: "ההצעה נדחתה" }); onStatusChange?.(); onSuccess?.(); onOpenChange(false);
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
  };

  const generateAiAnalysis = async (forceRefresh: boolean = false) => {
    setIsGeneratingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-proposal', { body: { proposalId: proposal.id, projectId, forceRefresh } });
      if (error) throw error;
      if (data?.analysis) { setAiAnalysis(data.analysis); toast({ title: forceRefresh ? "ניתוח AI רוענן" : "ניתוח AI הושלם" }); }
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
    finally { setIsGeneratingAi(false); }
  };

  const generateFileSummary = async (file: UploadedFile, forceRefresh: boolean = false) => {
    setGeneratingFileSummary(file.name);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-proposal-file', { body: { proposalId: proposal.id, fileName: file.name, fileUrl: fileUrls[file.name] || file.url, forceRefresh } });
      if (error) throw error;
      if (data?.summary) { const updated = { ...fileSummaries, [file.name]: data.summary }; setFileSummaries(updated); await supabase.from('proposals').update({ file_summaries: updated }).eq('id', proposal.id); toast({ title: forceRefresh ? "סיכום הקובץ רוענן" : "סיכום הקובץ הושלם" }); }
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
    finally { setGeneratingFileSummary(null); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: proposal.currency || 'ILS', minimumFractionDigits: 0 }).format(amount);
  const formatDate = (d: string) => format(new Date(d), "dd/MM/yyyy", { locale: he });
  const getFileIcon = (name: string) => { const ext = name.split('.').pop()?.toLowerCase(); if (['jpg','jpeg','png','gif','webp'].includes(ext||'')) return FileImage; if (['xlsx','xls','csv'].includes(ext||'')) return FileSpreadsheet; if (ext==='pdf') return FileText; return File; };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      submitted: { label: "הוגש", variant: "default", icon: CheckCircle }, accepted: { label: "אושר", variant: "default", icon: CheckCircle },
      rejected: { label: "נדחה", variant: "destructive", icon: XCircle }, under_review: { label: "בבדיקה", variant: "secondary", icon: AlertCircle },
      draft: { label: "טיוטה", variant: "outline", icon: FileText }, withdrawn: { label: "בוטל", variant: "outline", icon: XCircle },
    };
    const c = cfg[status] || cfg.draft; const Icon = c.icon;
    return <Badge variant={c.variant} className="gap-1"><Icon className="w-3 h-3" />{c.label}</Badge>;
  };

  // RTL section header component for consistency
  const SectionHeader = ({ icon: Icon, children, className = "" }: { icon: any; children: React.ReactNode; className?: string }) => (
    <h4 className={`flex items-center gap-2 font-semibold w-full justify-end text-right ${className}`}>
      {children}
      <Icon className="w-4 h-4" />
    </h4>
  );

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-[90vh] overflow-hidden p-0 flex flex-col" dir="rtl">
          <DialogHeader className="p-4 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between" dir="rtl">
              <DialogTitle className="text-lg font-bold text-right">הצעת מחיר - {proposal.supplier_name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleExportPDF}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>ייצוא PDF</TooltipContent>
                </Tooltip>
                {getStatusBadge(proposal.status)}
              </div>
            </div>
            {proposal.status === 'submitted' && (
              <div className="flex items-center gap-2 pt-2 justify-end" dir="rtl">
                <Button variant="destructive" size="sm" onClick={handleReject}>
                  <XCircle className="w-4 h-4 me-1" />
                  דחה הצעה
                </Button>
                <Button size="sm" onClick={() => setShowApprovalDialog(true)}>
                  <CheckCircle className="w-4 h-4 me-1" />
                  אשר הצעה
                </Button>
              </div>
            )}
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full flex flex-row-reverse justify-start rounded-none border-b bg-transparent px-4 flex-shrink-0">
              <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">פרטים</TabsTrigger>
              <TabsTrigger value="conditions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">תנאים</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">קבצים {files.length > 0 && `(${files.length})`}</TabsTrigger>
              <TabsTrigger value="signature" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">חתימה</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0">
              <TabsContent value="details" className="p-4 space-y-3 m-0">
                {advisorInfo && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-3">
                      <SectionHeader icon={Building2} className="mb-2 text-xs text-primary">פרטי הספק</SectionHeader>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-1.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <h3 className="font-bold text-base">{advisorInfo.company_name || proposal.supplier_name}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground justify-end">
                            {advisorInfo.founding_year && <span className="flex items-center gap-1">מאז {advisorInfo.founding_year}<Calendar className="w-3.5 h-3.5" /></span>}
                            {advisorInfo.office_size && <span className="flex items-center gap-1">{advisorInfo.office_size}<Users className="w-3.5 h-3.5" /></span>}
                            {advisorInfo.location && <span className="flex items-center gap-1">{advisorInfo.location}<MapPin className="w-3.5 h-3.5" /></span>}
                          </div>
                          {advisorInfo.expertise?.length && <div className="flex flex-wrap gap-1.5 pt-1 justify-end">{advisorInfo.expertise.slice(0,5).map((e,i)=><Badge key={i} variant="secondary" className="text-xs">{e}</Badge>)}</div>}
                          {(advisorInfo.website || advisorInfo.linkedin_url) && (
                            <div className="flex items-center gap-2 pt-1 justify-end">
                              {advisorInfo.linkedin_url && <Tooltip><TooltipTrigger asChild><a href={advisorInfo.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin className="w-4 h-4" /></a></TooltipTrigger><TooltipContent>לינקדאין</TooltipContent></Tooltip>}
                              {advisorInfo.website && <Tooltip><TooltipTrigger asChild><a href={advisorInfo.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Globe className="w-4 h-4" /></a></TooltipTrigger><TooltipContent>אתר</TooltipContent></Tooltip>}
                            </div>
                          )}
                        </div>
                        {advisorInfo.logo_url && <img src={advisorInfo.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover border flex-shrink-0" />}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {rfpContext && (rfpContext.advisor_type || rfpContext.request_title) && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-3">
                      <SectionHeader icon={Target} className="mb-1.5 text-xs text-blue-700">הגשה עבור</SectionHeader>
                      <div className="space-y-1 text-xs text-right">
                        {rfpContext.advisor_type && <p><span className="font-medium">סוג יועץ:</span> {rfpContext.advisor_type}</p>}
                        {rfpContext.request_title && <p><span className="font-medium">כותרת:</span> {rfpContext.request_title}</p>}
                        {rfpContext.deadline_at && <p className="text-muted-foreground"><span className="font-medium">מועד אחרון:</span> {formatDate(rfpContext.deadline_at)}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card><CardContent className="p-3 text-center"><Calendar className="w-4 h-4 mx-auto mb-1 text-purple-600" /><p className="text-xs text-muted-foreground">הוגש</p><p className="font-bold text-sm">{formatDate(proposal.submitted_at)}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><CalendarCheck className="w-4 h-4 mx-auto mb-1 text-green-600" /><p className="text-xs text-muted-foreground">סיום משוער</p><p className="font-bold text-sm">{format(estimatedCompletionDate, "dd/MM/yyyy", { locale: he })}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><Clock className="w-4 h-4 mx-auto mb-1 text-blue-600" /><p className="text-xs text-muted-foreground">לו״ז</p><p className="font-bold text-sm">{proposal.timeline_days} ימים</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><DollarSign className="w-4 h-4 mx-auto mb-1 text-green-600" /><p className="text-xs text-muted-foreground">מחיר</p><p className="font-bold text-sm">{formatCurrency(proposal.price)}</p></CardContent></Card>
                </div>
                {proposal.scope_text && (
                  <div className="space-y-1.5">
                    <SectionHeader icon={Briefcase} className="text-xs">היקף העבודה</SectionHeader>
                    <Card><CardContent className="p-3 text-right"><p className="text-xs whitespace-pre-wrap leading-relaxed">{proposal.scope_text}</p></CardContent></Card>
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => generateAiAnalysis(!!aiAnalysis)} disabled={isGeneratingAi}>
                      {isGeneratingAi ? <>מנתח...<Loader2 className="w-3 h-3 animate-spin ms-1" /></> : aiAnalysis ? <>רענן<RefreshCw className="w-3 h-3 ms-1" /></> : <>ייצר ניתוח<Sparkles className="w-3 h-3 ms-1" /></>}
                    </Button>
                    <SectionHeader icon={Sparkles} className="text-xs text-primary">ניתוח AI</SectionHeader>
                  </div>
                  {isGeneratingAi && <Card><CardContent className="p-3 flex items-center justify-center gap-2 text-muted-foreground text-xs">מייצר ניתוח AI...<Loader2 className="w-3 h-3 animate-spin" /></CardContent></Card>}
                  {aiAnalysis && !isGeneratingAi && <Card><CardContent className="p-3 text-right"><AIAnalysisDisplay content={aiAnalysis} /></CardContent></Card>}
                  {!aiAnalysis && !isGeneratingAi && <Card><CardContent className="p-3 text-center text-muted-foreground text-xs">לחץ על "ייצר ניתוח" לקבלת ניתוח AI של ההצעה</CardContent></Card>}
                </div>
              </TabsContent>

              <TabsContent value="conditions" className="p-4 space-y-3 m-0">
                <div className="space-y-1.5">
                  <SectionHeader icon={Banknote} className="text-xs text-green-600">תנאי תשלום</SectionHeader>
                  <Card><CardContent className="p-3 text-right"><p className="text-xs">{conditions.payment_terms || <span className="text-muted-foreground">לא צוינו תנאי תשלום</span>}</p></CardContent></Card>
                </div>
                <div className="space-y-1.5">
                  <SectionHeader icon={FileCheck} className="text-xs text-blue-600">הנחות יסוד</SectionHeader>
                  <Card><CardContent className="p-3 text-right"><p className="text-xs whitespace-pre-wrap">{conditions.assumptions || <span className="text-muted-foreground">לא צוינו הנחות יסוד</span>}</p></CardContent></Card>
                </div>
                <div className="space-y-1.5">
                  <SectionHeader icon={Scale} className="text-xs text-purple-600">החרגות</SectionHeader>
                  <Card><CardContent className="p-3 text-right"><p className="text-xs whitespace-pre-wrap">{conditions.exclusions || <span className="text-muted-foreground">לא צוינו החרגות</span>}</p></CardContent></Card>
                </div>
                {conditions.validity_days && (
                  <div className="space-y-1.5">
                    <SectionHeader icon={Clock} className="text-xs">תוקף ההצעה</SectionHeader>
                    <Card><CardContent className="p-3 text-right"><p className="text-xs">{conditions.validity_days} ימים</p></CardContent></Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="p-4 space-y-3 m-0">
                {files.length > 1 && (
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                      הורד הכל
                      <FolderDown className="w-4 h-4 ms-1.5" />
                    </Button>
                  </div>
                )}
                {loadingUrls ? <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">טוען קבצים...<Loader2 className="w-3 h-3 animate-spin" /></div>
                : files.length === 0 ? <Card><CardContent className="p-4 text-center text-muted-foreground"><FileText className="w-6 h-6 mx-auto mb-2 opacity-50" /><p className="text-sm">לא צורפו קבצים להצעה זו</p></CardContent></Card>
                : <div className="space-y-2">{files.map((file, i) => { const Icon = getFileIcon(file.name); const hasSummary = !!fileSummaries[file.name]; const isGen = generatingFileSummary === file.name; return (
                  <Card key={i}><CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5" dir="rtl">
                      <div className="flex items-center gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>generateFileSummary(file, !!fileSummaries[file.name])} disabled={isGen}>{isGen?<Loader2 className="w-3 h-3 animate-spin"/>:hasSummary?<RefreshCw className="w-3 h-3"/>:<Sparkles className="w-3 h-3"/>}</Button></TooltipTrigger><TooltipContent>{hasSummary?'נתח מחדש':'ניתוח AI'}</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>handleDownload(file)}><Download className="w-3 h-3" /></Button></TooltipTrigger><TooltipContent>הורדה</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>handleViewFile(file)}><Eye className="w-3 h-3" /></Button></TooltipTrigger><TooltipContent>צפייה</TooltipContent></Tooltip>
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size/1024).toFixed(1)} KB)</span>
                        <span className="text-xs font-medium truncate">{file.name}</span>
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                    {hasSummary && <><Separator className="my-1.5" /><div className="text-right"><AIAnalysisDisplay content={fileSummaries[file.name]} /></div></>}
                  </CardContent></Card>
                );})}</div>}
              </TabsContent>

              <TabsContent value="signature" className="p-4 space-y-3 m-0">
                <div className="space-y-1.5">
                  <SectionHeader icon={FileCheck} className="text-xs">חתימה דיגיטלית</SectionHeader>
                  {proposal.signature_blob ? (
                    <Card>
                      <CardContent className="p-3 space-y-3">
                        <div className="bg-white border rounded-lg p-3"><img src={proposal.signature_blob} alt="חתימה" className="max-h-20 mx-auto" /></div>
                        {proposal.signature_meta_json?.stampImage && (
                          <div className="bg-white border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground text-center mb-2">חותמת חברה</p>
                            <img src={proposal.signature_meta_json.stampImage} alt="חותמת" className="max-h-16 mx-auto" />
                          </div>
                        )}
                        {proposal.signature_meta_json && (
                          <div className="text-xs text-muted-foreground space-y-1 text-right">
                            {proposal.signature_meta_json.timestamp && <p>נחתם: {formatDate(proposal.signature_meta_json.timestamp)}</p>}
                            {proposal.signature_meta_json.signer_name && <p>חותם: {proposal.signature_meta_json.signer_name}</p>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card><CardContent className="p-4 text-center text-muted-foreground"><FileText className="w-6 h-6 mx-auto mb-2 opacity-50" /><p className="text-sm">לא נמצאה חתימה</p></CardContent></Card>
                  )}
                </div>
              </TabsContent>

            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ProposalApprovalDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog} proposal={proposal} onSuccess={()=>{ onStatusChange?.(); onSuccess?.(); onOpenChange(false); }} />
    </TooltipProvider>
  );
}

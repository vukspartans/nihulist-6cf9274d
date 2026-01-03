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
import { NegotiationDialog } from '@/components/negotiation/NegotiationDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateProposalPDF } from '@/utils/generateProposalPDF';
import { getFeeUnitLabel } from '@/constants/rfpUnits';
import JSZip from 'jszip';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  FileText, Banknote, Clock, Download, CheckCircle, XCircle, AlertCircle, Calendar,
  Eye, Sparkles, RefreshCw, Loader2, Building2, MapPin, Star, Globe, Linkedin,
  Users, Target, FolderDown, Briefcase, FileCheck, Scale, FileImage, 
  FileSpreadsheet, File, Printer, CalendarCheck, MessageSquare, ListChecks, CreditCard
} from 'lucide-react';

interface UploadedFile { name: string; url: string; size: number; type: string; }
interface AdvisorInfo { id: string; company_name: string | null; logo_url: string | null; expertise: string[] | null; rating: number | null; location: string | null; founding_year: number | null; office_size: string | null; website: string | null; linkedin_url: string | null; }
interface RfpInviteContext { advisor_type: string | null; request_title: string | null; deadline_at: string | null; }

interface FeeLineItem {
  description?: string;
  name?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  is_optional?: boolean;
  comment?: string;
}

interface MilestoneAdjustment {
  description: string;
  entrepreneur_percentage?: number;
  consultant_percentage?: number;
  is_entrepreneur_defined?: boolean;
}

interface ProposalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    id: string; project_id: string; advisor_id: string; supplier_name: string; price: number; timeline_days: number; currency?: string; scope_text?: string;
    conditions_json?: { payment_terms?: string; assumptions?: string; exclusions?: string; validity_days?: number; };
    files?: UploadedFile[]; signature_blob?: string; signature_meta_json?: { timestamp?: string; signer_name?: string; signer_email?: string; stampImage?: string; };
    status: string; submitted_at: string; ai_analysis?: string | null; ai_analysis_generated_at?: string | null; file_summaries?: Record<string, string> | null;
    advisors?: AdvisorInfo; rfp_invite?: RfpInviteContext; seen_by_entrepreneur_at?: string | null;
    fee_line_items?: FeeLineItem[]; milestone_adjustments?: MilestoneAdjustment[];
    selected_services?: any[]; services_notes?: string;
    consultant_request_notes?: string;
    consultant_request_files?: Array<{ name: string; path?: string; url?: string; size?: number }>;
    rfp_invite_id?: string;
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
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(proposal.ai_analysis || null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [fileSummaries, setFileSummaries] = useState<Record<string, string>>(proposal.file_summaries || {});
  const [generatingFileSummary, setGeneratingFileSummary] = useState<string | null>(null);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [entrepreneurPaymentTerms, setEntrepreneurPaymentTerms] = useState<{
    payment_term_type?: string;
    payment_due_days?: number;
    advance_percent?: number;
    notes?: string;
    milestone_payments?: Array<{description: string; percentage: number; trigger?: string}>;
  } | null>(null);
  const [consultantFileUrls, setConsultantFileUrls] = useState<Record<string, string>>({});

  const files = proposal.files || [];
  const conditions = proposal.conditions_json || {};
  const advisorInfo = proposal.advisors;
  const rfpContext = proposal.rfp_invite;
  const feeLineItems = proposal.fee_line_items || [];
  const milestoneAdjustments = proposal.milestone_adjustments || [];
  const selectedServices = proposal.selected_services || [];
  const consultantNotes = proposal.consultant_request_notes || '';
  const consultantFiles = proposal.consultant_request_files || [];

  // Helper function to calculate item total
  const getItemTotal = (item: FeeLineItem): number => {
    if (item.total !== undefined && item.total !== null && item.total > 0) return item.total;
    return (item.unit_price || 0) * (item.quantity || 1);
  };

  // Separate mandatory and optional fee items
  const mandatoryFees = feeLineItems.filter(item => !item.is_optional);
  const optionalFees = feeLineItems.filter(item => item.is_optional);
  const mandatoryTotal = mandatoryFees.reduce((sum, item) => sum + getItemTotal(item), 0);
  const optionalTotal = optionalFees.reduce((sum, item) => sum + getItemTotal(item), 0);

  // Calculate completion date
  const submissionDate = new Date(proposal.submitted_at);
  const estimatedCompletionDate = addDays(submissionDate, proposal.timeline_days);

  useEffect(() => {
    if (open && proposal.id && !proposal.seen_by_entrepreneur_at) markProposalAsSeen();
  }, [open, proposal.id]);

  useEffect(() => {
    if (open && files.length > 0) loadSignedUrls();
    if (open && consultantFiles.length > 0) loadConsultantFileUrls();
    if (proposal.ai_analysis) setAiAnalysis(proposal.ai_analysis);
    if (proposal.file_summaries) setFileSummaries(proposal.file_summaries);
  }, [open, proposal]);

  // Fetch service names when dialog opens with selected services
  useEffect(() => {
    const fetchServiceNames = async () => {
      if (!open || selectedServices.length === 0) return;
      
      const serviceIds = selectedServices
        .map(s => typeof s === 'string' ? s : s.id)
        .filter(id => typeof id === 'string' && id.length === 36);
      
      if (serviceIds.length === 0) return;
      
      const { data } = await supabase
        .from('rfp_service_scope_items')
        .select('id, task_name')
        .in('id', serviceIds);
      
      if (data) {
        const names: Record<string, string> = {};
        data.forEach(item => { names[item.id] = item.task_name; });
        setServiceNames(names);
      }
    };
    
    fetchServiceNames();
  }, [open, selectedServices]);

  // Fetch entrepreneur's payment terms from rfp_invites
  useEffect(() => {
    const fetchPaymentTerms = async () => {
      if (!open || !proposal.rfp_invite_id) return;
      
      const { data: inviteData } = await supabase
        .from('rfp_invites')
        .select('payment_terms')
        .eq('id', proposal.rfp_invite_id)
        .maybeSingle();
      
      if (inviteData?.payment_terms) {
        setEntrepreneurPaymentTerms(inviteData.payment_terms as any);
      }
    };
    
    fetchPaymentTerms();
  }, [open, proposal.rfp_invite_id]);

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

  const loadConsultantFileUrls = async () => {
    if (consultantFiles.length === 0) return;
    const urls: Record<string, string> = {};
    for (const file of consultantFiles) {
      try {
        // Use the stored url path directly if available (contains actual storage path)
        let filePath: string;
        if (file.url) {
          // The url field contains the actual storage path - strip any bucket prefix if present
          filePath = file.url.replace(/^.*\/proposal-files\//, '');
        } else {
          // Fallback: construct path from file info (for legacy data)
          const fileName = file.path?.split('/').pop() || file.name;
          filePath = `${proposal.id}/request-response/${fileName}`;
        }
        const { data } = await supabase.storage.from('proposal-files').createSignedUrl(filePath, 3600);
        if (data?.signedUrl) urls[file.name] = data.signedUrl;
      } catch {}
    }
    setConsultantFileUrls(urls);
  };

  const handleDownloadConsultantFile = async (file: { name: string; path?: string }) => {
    const url = consultantFileUrls[file.name];
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
        feeItems: feeLineItems.map((item) => ({
          description: item.description || item.name || '',
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unit_price,
          total: getItemTotal(item),
          isOptional: item.is_optional,
        })),
        milestones: milestoneAdjustments.map((m) => ({
          description: m.description,
          percentage: m.consultant_percentage || m.entrepreneur_percentage,
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
      negotiation_requested: { label: "במו״מ", variant: "secondary", icon: MessageSquare }, resubmitted: { label: "הוגש מחדש", variant: "default", icon: RefreshCw },
    };
    const c = cfg[status] || cfg.draft; const Icon = c.icon;
    return <Badge variant={c.variant} className="gap-1"><Icon className="w-3 h-3" />{c.label}</Badge>;
  };

  // RTL section header component for consistency
  const SectionHeader = ({ icon: Icon, children, className = "" }: { icon: any; children: React.ReactNode; className?: string }) => (
    <h4 className={`flex items-center gap-2 font-semibold w-full justify-end text-right text-sm ${className}`}>
      {children}
      <Icon className="w-4 h-4 text-primary" />
    </h4>
  );

  // Fee table component with RTL support and proper calculations
  const FeeTable = ({ items, title, showOptionalBadge = false }: { items: FeeLineItem[]; title: string; showOptionalBadge?: boolean }) => (
    <div className="space-y-1.5">
      <SectionHeader icon={Banknote} className="text-xs">{title}</SectionHeader>
      <Card>
        <CardContent className="p-0">
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto" dir="rtl">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="text-muted-foreground border-b">
                  <th className="text-right p-2 font-medium">תיאור</th>
                  <th className="text-center p-2 font-medium">יחידה</th>
                  <th className="text-center p-2 font-medium">כמות</th>
                  <th className="text-center p-2 font-medium">מחיר יח׳</th>
                  <th className="text-left p-2 font-medium">סה״כ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2 text-right">
                      <span>{item.description || item.name}</span>
                      {showOptionalBadge && item.is_optional && (
                        <Badge variant="outline" className="ms-2 text-[10px]">אופציונלי</Badge>
                      )}
                      {item.comment && (
                        <p className="text-muted-foreground text-[10px] mt-0.5">{item.comment}</p>
                      )}
                    </td>
                    <td className="p-2 text-center text-muted-foreground">{getFeeUnitLabel(item.unit || '') || '-'}</td>
                    <td className="p-2 text-center">{item.quantity || 1}</td>
                    <td className="p-2 text-center">{item.unit_price ? formatCurrency(item.unit_price) : '-'}</td>
                    <td className="p-2 text-left font-medium">{formatCurrency(getItemTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr>
                  <td colSpan={4} className="p-2 text-right font-semibold">סה״כ</td>
                  <td className="p-2 text-left font-bold text-primary">
                    {formatCurrency(items.reduce((sum, item) => sum + getItemTotal(item), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="md:hidden p-2 space-y-2" dir="rtl">
            {items.map((item, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium">{item.description || item.name}</span>
                  {showOptionalBadge && item.is_optional && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">אופציונלי</Badge>
                  )}
                </div>
                {item.comment && (
                  <p className="text-muted-foreground text-[10px]">{item.comment}</p>
                )}
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="text-center">
                    <p className="text-muted-foreground">יחידה</p>
                    <p className="font-medium">{getFeeUnitLabel(item.unit || '') || '-'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">כמות</p>
                    <p className="font-medium">{item.quantity || 1}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">מחיר יח׳</p>
                    <p className="font-medium">{item.unit_price ? formatCurrency(item.unit_price) : '-'}</p>
                  </div>
                </div>
                <div className="text-left pt-1 border-t">
                  <span className="text-xs text-muted-foreground">סה״כ: </span>
                  <span className="font-bold text-primary">{formatCurrency(getItemTotal(item))}</span>
                </div>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-bold text-primary">{formatCurrency(items.reduce((sum, item) => sum + getItemTotal(item), 0))}</span>
              <span className="font-semibold text-sm">סה״כ</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Dialog title - Project name + Category
  const dialogTitle = `${projectName || 'פרויקט'} - ${rfpContext?.advisor_type || 'הצעת מחיר'}`;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-[90vh] overflow-hidden p-0 flex flex-col" dir="rtl">
          <DialogHeader className="p-4 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between" dir="rtl">
              <DialogTitle className="text-lg font-bold text-right">{dialogTitle}</DialogTitle>
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
            {/* Action buttons - including Negotiation */}
            {(proposal.status === 'submitted' || proposal.status === 'resubmitted') && (
              <div className="flex items-center gap-2 pt-2 justify-end" dir="rtl">
                <Button variant="destructive" size="sm" onClick={handleReject}>
                  <XCircle className="w-4 h-4 me-1" />
                  דחה הצעה
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowNegotiationDialog(true)}>
                  <MessageSquare className="w-4 h-4 me-1" />
                  משא ומתן
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
              <TabsTrigger value="services" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">שירותים</TabsTrigger>
              <TabsTrigger value="payment" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">תנאי תשלום</TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Sparkles className="w-3.5 h-3.5 me-1" />
                ניתוח AI
              </TabsTrigger>
              <TabsTrigger value="signature" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">חתימה</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0">
              {/* Details Tab */}
              <TabsContent value="details" className="p-4 space-y-3 m-0">
                {/* Vendor Details */}
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

                {/* Submitted For */}
                {rfpContext && (rfpContext.advisor_type || rfpContext.request_title) && (
                  <Card>
                    <CardContent className="p-3">
                      <SectionHeader icon={Target} className="mb-1.5 text-xs">הגשה עבור</SectionHeader>
                      <div className="space-y-1 text-xs text-right">
                        {rfpContext.advisor_type && <p><span className="font-medium">סוג יועץ:</span> {rfpContext.advisor_type}</p>}
                        {rfpContext.request_title && <p><span className="font-medium">כותרת:</span> {rfpContext.request_title}</p>}
                        {rfpContext.deadline_at && <p className="text-muted-foreground"><span className="font-medium">מועד אחרון:</span> {formatDate(rfpContext.deadline_at)}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Consultant Response Section */}
                {(consultantNotes || consultantFiles.length > 0) && (
                  <Card>
                    <CardContent className="p-3">
                      <SectionHeader icon={MessageSquare} className="mb-2 text-xs">תגובת היועץ לבקשה</SectionHeader>
                      {consultantNotes && (
                        <p className="text-sm whitespace-pre-wrap text-right mb-2">{consultantNotes}</p>
                      )}
                      {consultantFiles.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground text-right">קבצים שצורפו:</p>
                          {consultantFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 justify-between text-sm bg-muted/30 p-2 rounded border" dir="rtl">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 flex-shrink-0" 
                                    onClick={() => handleDownloadConsultantFile(file)}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>הורדה</TooltipContent>
                              </Tooltip>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <Card><CardContent className="p-3 text-center"><Calendar className="w-4 h-4 mx-auto mb-1 text-primary" /><p className="text-xs text-muted-foreground">הוגש</p><p className="font-bold text-sm">{formatDate(proposal.submitted_at)}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><Banknote className="w-4 h-4 mx-auto mb-1 text-primary" /><p className="text-xs text-muted-foreground">מחיר כולל</p><p className="font-bold text-sm">{formatCurrency(proposal.price)}</p></CardContent></Card>
                </div>

                {/* Fee Rows Display */}
                {mandatoryFees.length > 0 && (
                  <FeeTable items={mandatoryFees} title="פירוט שכר טרחה" />
                )}

                {optionalFees.length > 0 && (
                  <FeeTable items={optionalFees} title="פריטים אופציונליים" showOptionalBadge />
                )}

                {/* Totals Summary */}
                {feeLineItems.length > 0 && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 space-y-1" dir="rtl">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">סה״כ חובה:</span>
                        <span className="font-bold text-primary">{formatCurrency(mandatoryTotal)}</span>
                      </div>
                      {optionalTotal > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">סה״כ אופציונלי:</span>
                          <span className="font-medium text-muted-foreground">{formatCurrency(optionalTotal)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* AI Analysis Tab */}
              <TabsContent value="ai" className="p-4 space-y-4 m-0">
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4" dir="rtl">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-base">ניתוח AI של ההצעה</h3>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => generateAiAnalysis(!!aiAnalysis)} 
                        disabled={isGeneratingAi}
                      >
                        {isGeneratingAi ? (
                          <>מנתח...<Loader2 className="w-3 h-3 animate-spin ms-1" /></>
                        ) : aiAnalysis ? (
                          <>רענן ניתוח<RefreshCw className="w-3 h-3 ms-1" /></>
                        ) : (
                          <>ייצר ניתוח<Sparkles className="w-3 h-3 ms-1" /></>
                        )}
                      </Button>
                    </div>
                    
                    {isGeneratingAi && (
                      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>מייצר ניתוח AI מקיף...</span>
                      </div>
                    )}
                    
                    {aiAnalysis && !isGeneratingAi && (
                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <AIAnalysisDisplay content={aiAnalysis} className="text-sm" />
                      </div>
                    )}
                    
                    {!aiAnalysis && !isGeneratingAi && (
                      <div className="text-center py-8 text-muted-foreground" dir="rtl">
                        <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">לחץ על "ייצר ניתוח" לקבלת ניתוח AI מקיף של ההצעה</p>
                        <p className="text-xs mt-1">הניתוח יכלול הערכת מחיר, זמנים, וחוזקות/חולשות</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="p-4 space-y-3 m-0">
                {/* Selected Services */}
                <div className="space-y-1.5">
                  <SectionHeader icon={ListChecks} className="text-xs">שירותים נבחרים</SectionHeader>
                  {selectedServices.length > 0 ? (
                    <Card>
                      <CardContent className="p-3">
                        <ul className="space-y-1.5 text-right">
                          {selectedServices.map((service, i) => {
                            // Resolve service name from UUID or use provided name
                            const serviceId = typeof service === 'string' ? service : service.id;
                            const displayName = typeof service === 'string' 
                              ? (serviceNames[service] || service) 
                              : (service.name || service.task_name || serviceNames[serviceId] || serviceId);
                            
                            return (
                              <li key={i} className="flex items-center gap-2 justify-end text-sm">
                                <span>{displayName}</span>
                                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card><CardContent className="p-4 text-center text-muted-foreground text-sm">לא נבחרו שירותים ספציפיים</CardContent></Card>
                  )}
                </div>

                {/* Services Notes */}
                {proposal.services_notes && (
                  <div className="space-y-1.5">
                    <SectionHeader icon={FileText} className="text-xs">הערות שירותים</SectionHeader>
                    <Card><CardContent className="p-3 text-right"><p className="text-xs whitespace-pre-wrap">{proposal.services_notes}</p></CardContent></Card>
                  </div>
                )}

                {/* Attached Files */}
                {files.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      {files.length > 1 && (
                        <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                          הורד הכל
                          <FolderDown className="w-4 h-4 ms-1.5" />
                        </Button>
                      )}
                      <SectionHeader icon={FileText} className="text-xs">קבצים מצורפים</SectionHeader>
                    </div>
                    {loadingUrls ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">טוען קבצים...<Loader2 className="w-3 h-3 animate-spin" /></div>
                    ) : (
                      <div className="space-y-2">
                        {files.map((file, i) => { 
                          const Icon = getFileIcon(file.name); 
                          const hasSummary = !!fileSummaries[file.name]; 
                          const isGen = generatingFileSummary === file.name; 
                          return (
                            <Card key={i}>
                              <CardContent className="p-3">
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
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Payment Terms Tab */}
              <TabsContent value="payment" className="p-4 space-y-3 m-0">
                {/* Milestone Breakdown */}
                {milestoneAdjustments.length > 0 && (
                  <div className="space-y-1.5">
                    <SectionHeader icon={CreditCard} className="text-xs text-green-600">אבני דרך לתשלום</SectionHeader>
                    <Card>
                      <CardContent className="p-0">
                        {/* Desktop table view */}
                        <div className="hidden md:block overflow-x-auto" dir="rtl">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50">
                              <tr className="text-muted-foreground border-b">
                                <th className="text-right p-2 font-medium">שלב</th>
                                <th className="text-center p-2 font-medium">אחוז</th>
                                <th className="text-left p-2 font-medium">סכום משוער</th>
                              </tr>
                            </thead>
                            <tbody>
                              {milestoneAdjustments.map((milestone, i) => {
                                const percentage = milestone.consultant_percentage ?? milestone.entrepreneur_percentage ?? 0;
                                const amount = (mandatoryTotal * percentage) / 100;
                                return (
                                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="p-2 text-right">{milestone.description}</td>
                                    <td className="p-2 text-center font-medium">{percentage}%</td>
                                    <td className="p-2 text-left">{formatCurrency(amount)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {/* Mobile card view */}
                        <div className="md:hidden p-2 space-y-2" dir="rtl">
                          {milestoneAdjustments.map((milestone, i) => {
                            const percentage = milestone.consultant_percentage ?? milestone.entrepreneur_percentage ?? 0;
                            const amount = (mandatoryTotal * percentage) / 100;
                            return (
                              <div key={i} className="border rounded-lg p-3 flex justify-between items-center bg-muted/20">
                                <div className="text-left">
                                  <p className="font-medium text-xs">{percentage}%</p>
                                  <p className="text-[10px] text-muted-foreground">{formatCurrency(amount)}</p>
                                </div>
                                <span className="text-xs font-medium">{milestone.description}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Payment Terms Text */}
                <div className="space-y-1.5">
                  <SectionHeader icon={Banknote} className="text-xs">תנאי תשלום</SectionHeader>
                  <Card>
                    <CardContent className="p-3 text-right space-y-2">
                      {entrepreneurPaymentTerms?.payment_term_type && (
                        <p className="text-xs">
                          <span className="font-medium">תנאי תשלום: </span>
                          {entrepreneurPaymentTerms.payment_term_type === 'net_30' && 'שוטף + 30'}
                          {entrepreneurPaymentTerms.payment_term_type === 'net_60' && 'שוטף + 60'}
                          {entrepreneurPaymentTerms.payment_term_type === 'net_90' && 'שוטף + 90'}
                          {entrepreneurPaymentTerms.payment_term_type === 'current' && 'שוטף'}
                          {entrepreneurPaymentTerms.payment_term_type === 'upon_completion' && 'בסיום העבודה'}
                          {entrepreneurPaymentTerms.payment_term_type === 'milestone' && 'לפי אבני דרך'}
                          {!['net_30', 'net_60', 'net_90', 'current', 'upon_completion', 'milestone'].includes(entrepreneurPaymentTerms.payment_term_type) && entrepreneurPaymentTerms.payment_term_type}
                        </p>
                      )}
                      {entrepreneurPaymentTerms?.advance_percent && entrepreneurPaymentTerms.advance_percent > 0 && (
                        <p className="text-xs">
                          <span className="font-medium">מקדמה: </span>
                          {entrepreneurPaymentTerms.advance_percent}%
                        </p>
                      )}
                      {entrepreneurPaymentTerms?.notes && (
                        <p className="text-xs">
                          <span className="font-medium">הערות: </span>
                          {entrepreneurPaymentTerms.notes}
                        </p>
                      )}
                      {conditions.payment_terms && (
                        <p className="text-xs whitespace-pre-wrap">{conditions.payment_terms}</p>
                      )}
                      {!entrepreneurPaymentTerms && !conditions.payment_terms && (
                        <span className="text-muted-foreground text-xs">לא צוינו תנאי תשלום</span>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Assumptions */}
                <div className="space-y-1.5">
                  <SectionHeader icon={FileCheck} className="text-xs">הנחות יסוד</SectionHeader>
                  <Card><CardContent className="p-3 text-right"><p className="text-xs whitespace-pre-wrap">{conditions.assumptions || <span className="text-muted-foreground">לא צוינו הנחות יסוד</span>}</p></CardContent></Card>
                </div>

                {/* Validity */}
                {conditions.validity_days && (
                  <div className="space-y-1.5">
                    <SectionHeader icon={Clock} className="text-xs">תוקף ההצעה</SectionHeader>
                    <Card><CardContent className="p-3 text-right"><p className="text-xs">{conditions.validity_days} ימים</p></CardContent></Card>
                  </div>
                )}
              </TabsContent>

              {/* Signature Tab */}
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
      
      <NegotiationDialog
        open={showNegotiationDialog}
        onOpenChange={setShowNegotiationDialog}
        proposal={{
          id: proposal.id,
          price: proposal.price,
          supplier_name: proposal.supplier_name,
          project_id: proposal.project_id,
        }}
        onSuccess={() => {
          onStatusChange?.();
          onSuccess?.();
          onOpenChange(false);
        }}
      />
    </TooltipProvider>
  );
}

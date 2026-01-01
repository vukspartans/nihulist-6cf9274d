import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNegotiation } from '@/hooks/useNegotiation';
import { getFeeUnitLabel } from '@/constants/rfpUnits';
import JSZip from 'jszip';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Home, List, FileText, Calendar, Download,
  CheckCircle, XCircle, AlertCircle, Eye, Loader2, MapPin, Building2,
  FileImage, FileSpreadsheet, File, FolderDown, Banknote, CreditCard, Coins, MessageSquare,
  ClipboardList, Package, Plus
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
  url?: string;
  path?: string;
  size?: number;
  type?: string;
}

interface FeeLineItem {
  item_id?: string;
  description: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  comment?: string;
  is_optional?: boolean;
  is_entrepreneur_defined?: boolean;
}

interface MilestoneAdjustment {
  description: string;
  entrepreneur_percentage: number;
  consultant_percentage: number;
  is_entrepreneur_defined?: boolean;
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
  // Structured data columns
  fee_line_items?: FeeLineItem[];
  selected_services?: any[];
  milestone_adjustments?: MilestoneAdjustment[];
  consultant_request_notes?: string;
  consultant_request_files?: UploadedFile[];
  services_notes?: string;
}

export function AdvisorProposalViewDialog({ open, onOpenChange, proposalId }: AdvisorProposalViewDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('main');
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [negotiationSessionId, setNegotiationSessionId] = useState<string | null>(null);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const { fetchNegotiationByProposal } = useNegotiation();

  // Helper to calculate item total dynamically (fallback when total field is missing)
  const getItemTotal = (item: FeeLineItem): number => {
    if (item.total !== undefined && item.total !== null && item.total > 0) return item.total;
    return (item.unit_price || 0) * (item.quantity || 1);
  };

  // Fetch service names from rfp_service_scope_items to resolve UUIDs
  const fetchServiceNames = async (serviceIds: string[]) => {
    if (serviceIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('rfp_service_scope_items')
        .select('id, task_name')
        .in('id', serviceIds);
      
      if (data && !error) {
        const names: Record<string, string> = {};
        data.forEach(item => {
          names[item.id] = item.task_name;
        });
        setServiceNames(names);
      }
    } catch (err) {
      console.error('Error fetching service names:', err);
    }
  };

  useEffect(() => {
    if (open && proposalId) {
      fetchProposal();
      checkActiveNegotiation();
    }
  }, [open, proposalId]);

  const checkActiveNegotiation = async () => {
    if (!proposalId) return;
    const session = await fetchNegotiationByProposal(proposalId);
    setNegotiationSessionId(session?.id || null);
  };

  const fetchProposal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id, price, timeline_days, currency, scope_text, conditions_json,
          files, signature_blob, signature_meta_json, status, submitted_at,
          fee_line_items, selected_services, milestone_adjustments,
          consultant_request_notes, consultant_request_files, services_notes,
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
        fee_line_items: (data.fee_line_items as unknown as FeeLineItem[]) || [],
        selected_services: (data.selected_services as unknown as any[]) || [],
        milestone_adjustments: (data.milestone_adjustments as unknown as MilestoneAdjustment[]) || [],
        consultant_request_notes: data.consultant_request_notes as string,
        consultant_request_files: (data.consultant_request_files as unknown as UploadedFile[]) || [],
        services_notes: data.services_notes as string,
      };
      setProposal(proposalData);

      // Fetch service names if there are selected services (which are UUIDs)
      const serviceIds = (proposalData.selected_services || []).filter(
        (s: any) => typeof s === 'string' && s.match(/^[0-9a-f-]{36}$/i)
      );
      if (serviceIds.length > 0) {
        fetchServiceNames(serviceIds);
      }

      // Combine all files for URL loading
      const allFiles = [
        ...(proposalData.files || []),
        ...(proposalData.consultant_request_files || [])
      ];
      if (allFiles.length > 0) {
        await loadSignedUrls(allFiles);
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
        const fileUrl = file.url || file.path || '';
        const filePath = fileUrl.replace(/^.*\/proposal-files\//, '');
        if (filePath) {
          const { data } = await supabase.storage.from('proposal-files').createSignedUrl(filePath, 3600);
          if (data?.signedUrl) urls[file.name] = data.signedUrl;
        }
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

  const handleDownloadAll = async (files: UploadedFile[]) => {
    if (files.length === 0) return;
    try {
      const zip = new JSZip();
      for (const file of files) {
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

  // Calculated values
  const conditions = proposal?.conditions_json || {};
  const files = proposal?.files || [];
  const consultantFiles = proposal?.consultant_request_files || [];
  const allFiles = [...files, ...consultantFiles];
  const feeLineItems = proposal?.fee_line_items || [];
  const mandatoryItems = feeLineItems.filter(item => !item.is_optional);
  const optionalItems = feeLineItems.filter(item => item.is_optional);
  const mandatoryTotal = mandatoryItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  const optionalTotal = optionalItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  const selectedServices = proposal?.selected_services || [];
  const milestoneAdjustments = proposal?.milestone_adjustments || [];
  
  const hasConditions = conditions.payment_terms || conditions.payment_term_type || 
    (conditions.milestones && conditions.milestones.length > 0) || 
    milestoneAdjustments.length > 0 ||
    conditions.assumptions || conditions.exclusions || 
    conditions.validity_days || conditions.notes;

  const hasPricingData = feeLineItems.length > 0;
  const hasServicesData = selectedServices.length > 0 || proposal?.services_notes;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl" dir="rtl">
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
        <DialogContent className="max-w-3xl" dir="rtl">
          <div className="text-center p-6 text-muted-foreground text-sm">
            לא נמצאה הצעה
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const statusConfig = getStatusConfig(proposal.status);
  const StatusIcon = statusConfig.icon;

  // File rendering component
  const renderFileItem = (file: UploadedFile, idx: number) => {
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
            {file.size && (
              <p className="text-[10px] text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
          <FileIcon className="h-6 w-6 text-muted-foreground shrink-0" />
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0" dir="rtl">
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
            <div className="flex items-center justify-between gap-2">
              <span>{statusConfig.bannerText}</span>
              {proposal.status === 'negotiation_requested' && negotiationSessionId && (
                <Button
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/negotiation/${negotiationSessionId}`);
                  }}
                >
                  <MessageSquare className="h-3 w-3" />
                  הגב לבקשה
                </Button>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full flex flex-row-reverse justify-start rounded-none border-b bg-transparent px-3 h-9">
              <TabsTrigger value="main" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1 text-xs px-2 py-1">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ראשי</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1 text-xs px-2 py-1">
                <Banknote className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">תמחור</span>
                {hasPricingData && <Badge variant="secondary" className="text-[10px] px-1 h-4">{feeLineItems.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="services" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1 text-xs px-2 py-1">
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">שירותים</span>
              </TabsTrigger>
              <TabsTrigger value="conditions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-1 text-xs px-2 py-1">
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">תנאים וקבצים</span>
                {allFiles.length > 0 && <Badge variant="secondary" className="text-[10px] px-1 h-4">{allFiles.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-160px)]">
              {/* Tab 1: Main - Key metrics + Consultant Response + Signature */}
              <TabsContent value="main" className="p-3 space-y-3 m-0">
                {/* Key Metrics Row - 2 columns, no לו״ז */}
                <div className="grid grid-cols-2 gap-2">
                  <Card className="bg-muted/30">
                    <CardContent className="p-2 text-center">
                      <Calendar className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                      <p className="text-[10px] text-muted-foreground">הוגש</p>
                      <p className="font-bold text-xs">{formatDate(proposal.submitted_at)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-2 text-center">
                      <Banknote className="w-4 h-4 mx-auto mb-1 text-green-600" />
                      <p className="text-[10px] text-muted-foreground">סה״כ מחיר</p>
                      <p className="font-bold text-xs text-green-700">{formatCurrency(proposal.price)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Scope of Work */}
                {proposal.scope_text && (
                  <Card>
                    <CardContent className="p-3">
                      <SectionHeader icon={Building2}>היקף העבודה</SectionHeader>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed text-right mt-2">{proposal.scope_text}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Consultant Response Notes */}
                {proposal.consultant_request_notes && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-3">
                      <SectionHeader icon={MessageSquare} className="text-blue-700">הערות לבקשה</SectionHeader>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed text-right mt-2">{proposal.consultant_request_notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Signature */}
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

              {/* Tab 2: Pricing - Fee breakdown table */}
              <TabsContent value="pricing" className="p-3 space-y-3 m-0">
                {!hasPricingData ? (
                  <Card>
                    <CardContent className="p-4 text-center text-muted-foreground text-xs">
                      <Banknote className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      לא הוזנו פריטי תמחור
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Mandatory Items */}
                    {mandatoryItems.length > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <SectionHeader icon={Package}>פריטים חובה</SectionHeader>
                          
                          {/* Desktop Table */}
                          <div className="hidden md:block mt-2" dir="rtl">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-right text-xs">תיאור</TableHead>
                                  <TableHead className="text-right text-xs w-16">כמות</TableHead>
                                  <TableHead className="text-right text-xs w-20">יחידה</TableHead>
                                  <TableHead className="text-right text-xs w-24">מחיר יח׳</TableHead>
                                  <TableHead className="text-right text-xs w-24">סה״כ</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {mandatoryItems.map((item, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-xs text-right">
                                      {item.description}
                                      {item.comment && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.comment}</p>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">{item.quantity || 1}</TableCell>
                                    <TableCell className="text-xs text-right">{getFeeUnitLabel(item.unit || '') || '-'}</TableCell>
                                    <TableCell className="text-xs text-right">{formatCurrency(item.unit_price || 0)}</TableCell>
                                    <TableCell className="text-xs font-medium text-right">{formatCurrency(getItemTotal(item))}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              <TableFooter>
                                <TableRow>
                                  <TableCell colSpan={4} className="text-xs font-bold text-right">סה״כ פריטי חובה</TableCell>
                                  <TableCell className="text-xs font-bold text-right">{formatCurrency(mandatoryTotal)}</TableCell>
                                </TableRow>
                              </TableFooter>
                            </Table>
                          </div>

                          {/* Mobile Cards */}
                          <div className="md:hidden mt-2 space-y-2">
                            {mandatoryItems.map((item, idx) => (
                              <div key={idx} className="border rounded-lg p-3 bg-muted/30 space-y-2">
                                <p className="text-xs font-medium text-right">{item.description}</p>
                                <div className="flex gap-3 text-xs text-muted-foreground justify-end flex-wrap">
                                  <span>{getFeeUnitLabel(item.unit || '') || '-'}</span>
                                  <span>כמות: {item.quantity || 1}</span>
                                  <span>מחיר: {formatCurrency(item.unit_price || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t">
                                  <span className="text-xs font-bold">{formatCurrency(getItemTotal(item))}</span>
                                  <span className="text-[10px] text-muted-foreground">סה״כ</span>
                                </div>
                                {item.comment && (
                                  <p className="text-[10px] text-muted-foreground text-right">{item.comment}</p>
                                )}
                              </div>
                            ))}
                            <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                              <span className="text-xs font-bold">{formatCurrency(mandatoryTotal)}</span>
                              <span className="text-xs font-semibold">סה״כ פריטי חובה</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Optional Items */}
                    {optionalItems.length > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <SectionHeader icon={Plus}>פריטים אופציונליים</SectionHeader>
                          
                          {/* Desktop Table */}
                          <div className="hidden md:block mt-2" dir="rtl">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-right text-xs">תיאור</TableHead>
                                  <TableHead className="text-right text-xs w-16">כמות</TableHead>
                                  <TableHead className="text-right text-xs w-20">יחידה</TableHead>
                                  <TableHead className="text-right text-xs w-24">מחיר יח׳</TableHead>
                                  <TableHead className="text-right text-xs w-24">סה״כ</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {optionalItems.map((item, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-xs text-right">
                                      {item.description}
                                      {item.comment && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.comment}</p>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">{item.quantity || 1}</TableCell>
                                    <TableCell className="text-xs text-right">{getFeeUnitLabel(item.unit || '') || '-'}</TableCell>
                                    <TableCell className="text-xs text-right">{formatCurrency(item.unit_price || 0)}</TableCell>
                                    <TableCell className="text-xs font-medium text-right">{formatCurrency(getItemTotal(item))}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              <TableFooter>
                                <TableRow>
                                  <TableCell colSpan={4} className="text-xs font-bold text-right">סה״כ אופציונלי</TableCell>
                                  <TableCell className="text-xs font-bold text-right">{formatCurrency(optionalTotal)}</TableCell>
                                </TableRow>
                              </TableFooter>
                            </Table>
                          </div>

                          {/* Mobile Cards */}
                          <div className="md:hidden mt-2 space-y-2">
                            {optionalItems.map((item, idx) => (
                              <div key={idx} className="border rounded-lg p-3 bg-muted/30 space-y-2">
                                <p className="text-xs font-medium text-right">{item.description}</p>
                                <div className="flex gap-3 text-xs text-muted-foreground justify-end flex-wrap">
                                  <span>{getFeeUnitLabel(item.unit || '') || '-'}</span>
                                  <span>כמות: {item.quantity || 1}</span>
                                  <span>מחיר: {formatCurrency(item.unit_price || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t">
                                  <span className="text-xs font-bold">{formatCurrency(getItemTotal(item))}</span>
                                  <span className="text-[10px] text-muted-foreground">סה״כ</span>
                                </div>
                                {item.comment && (
                                  <p className="text-[10px] text-muted-foreground text-right">{item.comment}</p>
                                )}
                              </div>
                            ))}
                            <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                              <span className="text-xs font-bold">{formatCurrency(optionalTotal)}</span>
                              <span className="text-xs font-semibold">סה״כ אופציונלי</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Grand Total */}
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-green-700">{formatCurrency(proposal.price)}</span>
                          <span className="text-xs font-semibold">סה״כ הצעה</span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Tab 3: Services */}
              <TabsContent value="services" className="p-3 space-y-3 m-0">
                {!hasServicesData ? (
                  <Card>
                    <CardContent className="p-4 text-center text-muted-foreground text-xs">
                      <ClipboardList className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      לא נבחרו שירותים
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Selected Services */}
                    {selectedServices.length > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <SectionHeader icon={ClipboardList}>שירותים שנבחרו</SectionHeader>
                          <div className="mt-2 space-y-1">
                            {selectedServices.map((service: any, idx: number) => {
                              // Resolve UUID to service name
                              const displayName = typeof service === 'string' 
                                ? (serviceNames[service] || (service.match(/^[0-9a-f-]{36}$/i) ? 'טוען...' : service))
                                : service.name || service.task_name || service.title || JSON.stringify(service);
                              
                              return (
                                <div key={idx} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-xs">
                                  <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                                  <span className="text-right flex-1">{displayName}</span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Services Notes */}
                    {proposal.services_notes && (
                      <Card>
                        <CardContent className="p-3">
                          <SectionHeader icon={FileText}>הערות לשירותים</SectionHeader>
                          <p className="text-xs whitespace-pre-wrap leading-relaxed text-right mt-2">
                            {proposal.services_notes}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Tab 4: Conditions & Files */}
              <TabsContent value="conditions" className="p-3 space-y-3 m-0">
                {/* Conditions Section */}
                {hasConditions && (
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

                      {/* Milestones from conditions */}
                      {conditions.milestones && conditions.milestones.length > 0 && (
                        <>
                          {(conditions.payment_terms || conditions.payment_term_type) && <Separator />}
                          <div>
                            <SectionHeader icon={Coins}>אבני דרך (תשלומים)</SectionHeader>
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

                      {/* Milestone Adjustments (consultant's adjustments) */}
                      {milestoneAdjustments.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <SectionHeader icon={Coins}>התאמות אבני דרך</SectionHeader>
                            <div className="space-y-1 mt-1">
                              {milestoneAdjustments.map((m, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded">
                                  <div className="flex gap-2">
                                    <Badge variant="outline" className="text-[10px] px-1.5">
                                      יזם: {m.entrepreneur_percentage}%
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] px-1.5">
                                      יועץ: {m.consultant_percentage}%
                                    </Badge>
                                  </div>
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

                {/* Files Section */}
                <Card>
                  <CardContent className="p-3">
                    <SectionHeader icon={FileText}>קבצים מצורפים</SectionHeader>
                    
                    {allFiles.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center mt-3">לא צורפו קבצים</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {allFiles.length > 1 && (
                          <Button variant="outline" size="sm" onClick={() => handleDownloadAll(allFiles)} className="w-full text-xs h-8">
                            <FolderDown className="h-3.5 w-3.5 me-1.5" />
                            הורד הכל ({allFiles.length})
                          </Button>
                        )}
                        
                        {/* Proposal Files */}
                        {files.length > 0 && (
                          <div className="space-y-1.5">
                            {consultantFiles.length > 0 && (
                              <p className="text-[10px] text-muted-foreground font-medium">קבצי הצעה:</p>
                            )}
                            {files.map((file, idx) => renderFileItem(file, idx))}
                          </div>
                        )}

                        {/* Consultant Response Files */}
                        {consultantFiles.length > 0 && (
                          <div className="space-y-1.5">
                            {files.length > 0 && <Separator />}
                            <p className="text-[10px] text-muted-foreground font-medium">קבצי תגובה לבקשה:</p>
                            {consultantFiles.map((file, idx) => renderFileItem(file, idx + files.length))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

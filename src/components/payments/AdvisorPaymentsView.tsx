import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { CreatePaymentRequestDialog } from './CreatePaymentRequestDialog';
import { PaymentMilestone, PaymentRequest } from '@/types/payment';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, AlertTriangle, CheckCircle, FileText, Loader2, Check, X, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdvisorPaymentRequest extends PaymentRequest {
  project_name?: string;
  milestone_name?: string;
  investor_name?: string;
  specialty?: string;
  milestone_due_date?: string | null;
  cumulative_percent?: number;
  is_professionally_approved?: boolean;
  is_transferred_to_accountant?: boolean;
}

// Statuses at or beyond professional approval
const APPROVED_STATUSES = new Set([
  'professionally_approved', 'budget_approved', 'awaiting_payment', 'paid',
]);
// Statuses at or beyond transfer to accountant
const TRANSFERRED_STATUSES = new Set([
  'budget_approved', 'awaiting_payment', 'paid',
]);

export function AdvisorPaymentsView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [projectAdvisorIds, setProjectAdvisorIds] = useState<string[]>([]);
  const [requests, setRequests] = useState<AdvisorPaymentRequest[]>([]);
  const [dueMilestones, setDueMilestones] = useState<PaymentMilestone[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [acknowledgedInvoices, setAcknowledgedInvoices] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  // Total fee per project_advisor for cumulative % calculation
  const [feeByProjectAdvisor, setFeeByProjectAdvisor] = useState<Map<string, number>>(new Map());

  const enrichRequests = useCallback(async (
    reqData: any[],
    pas: { id: string; project_id: string; fee_amount: number }[],
    advisorIdVal: string,
  ) => {
    const projectIds = [...new Set(pas.map(pa => pa.project_id))];

    // Fetch projects with owner
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .in('id', projectIds);

    // Fetch owner profiles + organizations for investor name
    const ownerIds = [...new Set((projects || []).map(p => p.owner_id))];
    let investorNames: Record<string, string> = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, organization_id')
        .in('user_id', ownerIds);
      
      const orgIds = (profiles || []).filter(p => p.organization_id).map(p => p.organization_id!) as string[];
      let companyNames: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', orgIds);
        companyNames = Object.fromEntries((companies || []).map(c => [c.id, c.name]));
      }
      investorNames = Object.fromEntries(
        (profiles || []).map(p => [
          p.user_id,
          (p.organization_id && companyNames[p.organization_id]) || p.name || 'יזם',
        ])
      );
    }

    // Fetch advisor_type (specialty) from rfp_invites for this advisor
    const { data: invites } = await supabase
      .from('rfp_invites')
      .select('id, advisor_type, rfp_id, rfps!inner(project_id)')
      .eq('advisor_id', advisorIdVal);

    // Map project_id -> advisor_type
    const specialtyByProject: Record<string, string> = {};
    (invites || []).forEach((inv: any) => {
      if (inv.rfps?.project_id && inv.advisor_type) {
        specialtyByProject[inv.rfps.project_id] = inv.advisor_type;
      }
    });

    const projectMap = new Map((projects || []).map(p => [p.id, p]));
    const paProjectMap = new Map(pas.map(pa => [pa.id, pa.project_id]));
    const paFeeMap = new Map(pas.map(pa => [pa.id, pa.fee_amount || 0]));
    setFeeByProjectAdvisor(paFeeMap);

    // Calculate cumulative paid per project_advisor
    const paidByPa = new Map<string, number>();
    (reqData || []).forEach((r: any) => {
      if (r.status === 'paid' && r.project_advisor_id) {
        paidByPa.set(
          r.project_advisor_id,
          (paidByPa.get(r.project_advisor_id) || 0) + (r.total_amount || r.amount),
        );
      }
    });

    const enriched: AdvisorPaymentRequest[] = (reqData || []).map((r: any) => {
      const paProjectId = paProjectMap.get(r.project_advisor_id || '') || '';
      const project = projectMap.get(paProjectId);
      const totalFee = paFeeMap.get(r.project_advisor_id || '') || 0;
      const totalPaidForPa = paidByPa.get(r.project_advisor_id || '') || 0;
      // For non-paid requests, include this request's amount in cumulative if it's been submitted
      const cumulativeAmount = r.status === 'paid'
        ? totalPaidForPa
        : totalPaidForPa + (r.total_amount || r.amount);
      const cumulativePercent = totalFee > 0 ? (cumulativeAmount / totalFee) * 100 : 0;

      return {
        ...r,
        project_name: project?.name || '',
        milestone_name: r.payment_milestone?.name || '',
        investor_name: project ? investorNames[project.owner_id] || '' : '',
        specialty: specialtyByProject[paProjectId] || '',
        milestone_due_date: r.payment_milestone?.due_date || null,
        cumulative_percent: Math.min(cumulativePercent, 100),
        is_professionally_approved: APPROVED_STATUSES.has(r.status),
        is_transferred_to_accountant: TRANSFERRED_STATUSES.has(r.status),
      } as AdvisorPaymentRequest;
    });

    return enriched;
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: advisor } = await supabase
          .from('advisors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!advisor) { setLoading(false); return; }
        setAdvisorId(advisor.id);

        const { data: pas } = await supabase
          .from('project_advisors')
          .select('id, project_id, fee_amount')
          .eq('advisor_id', advisor.id)
          .eq('status', 'active');

        const paIds = (pas || []).map(pa => pa.id);
        setProjectAdvisorIds(paIds);

        if (paIds.length === 0) { setLoading(false); return; }

        const { data: reqData } = await supabase
          .from('payment_requests')
          .select(`
            *,
            payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey (id, name, due_date)
          `)
          .in('project_advisor_id', paIds)
          .order('created_at', { ascending: false });

        const enriched = await enrichRequests(reqData || [], pas as any[], advisor.id);
        setRequests(enriched);

        const { data: milestoneData } = await supabase
          .from('payment_milestones')
          .select('*')
          .in('project_advisor_id', paIds)
          .eq('status', 'due');

        setDueMilestones((milestoneData as PaymentMilestone[]) || []);

        if (milestoneData && milestoneData.length > 0) {
          setSelectedProjectId(milestoneData[0].project_id);
        } else if (pas && pas.length > 0) {
          setSelectedProjectId(pas[0].project_id);
        }
      } catch (err) {
        console.error('[AdvisorPaymentsView] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, enrichRequests]);

  const terminalStatuses = useMemo(() => new Set(['paid', 'rejected']), []);

  const filteredRequests = useMemo(() => {
    if (showClosed) return requests.filter(r => terminalStatuses.has(r.status));
    return requests.filter(r => !terminalStatuses.has(r.status));
  }, [requests, showClosed, terminalStatuses]);

  const paidRequests = useMemo(
    () => requests.filter(r => r.status === 'paid' && !acknowledgedInvoices.has(r.id)),
    [requests, acknowledgedInvoices],
  );

  const handleAcknowledgeInvoice = (requestId: string) => {
    setAcknowledgedInvoices(prev => new Set(prev).add(requestId));
    toast({ title: 'סומן כהונפק', description: 'חשבונית המס סומנה כהונפקה.' });
  };

  const refetchRequests = async () => {
    if (!advisorId) return;
    const { data: reqData } = await supabase
      .from('payment_requests')
      .select(`*, payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey (id, name, due_date)`)
      .in('project_advisor_id', projectAdvisorIds)
      .order('created_at', { ascending: false });
    const { data: pas } = await supabase
      .from('project_advisors')
      .select('id, project_id, fee_amount')
      .eq('advisor_id', advisorId)
      .eq('status', 'active');
    const enriched = await enrichRequests(reqData || [], pas as any[], advisorId);
    setRequests(enriched);
  };

  const handleSubmitRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('payment_requests')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_by: user?.id,
      })
      .eq('id', requestId);

    if (error) {
      toast({ title: 'שגיאה', description: 'לא ניתן להגיש את הבקשה', variant: 'destructive' });
      return;
    }

    try {
      await supabase.functions.invoke('notify-payment-status', {
        body: { type: 'status_changed', payment_request_id: requestId },
      });
    } catch {}

    toast({ title: 'הבקשה הוגשה', description: 'בקשת התשלום נשלחה לאישור.' });
    await refetchRequests();
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('האם למחוק את בקשת התשלום?')) return;
    const { error } = await supabase
      .from('payment_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      toast({ title: 'שגיאה', description: 'לא ניתן למחוק את הבקשה', variant: 'destructive' });
      return;
    }
    toast({ title: 'נמחקה', description: 'בקשת התשלום נמחקה.' });
    await refetchRequests();
  };

  const handleNewRequest = async (data: Partial<PaymentRequest>) => {
    if (!selectedProjectId || !advisorId) return;
    try {
      const vatPercent = data.vat_percent ?? 17;
      const amount = data.amount || 0;
      const baseForVat = data.index_adjusted_amount ?? amount;
      const vatAmount = baseForVat * (vatPercent / 100);
      const totalAmount = baseForVat + vatAmount;

      const { error } = await supabase
        .from('payment_requests')
        .insert({
          project_id: selectedProjectId,
          project_advisor_id: data.project_advisor_id,
          payment_milestone_id: data.payment_milestone_id,
          amount,
          vat_percent: vatPercent,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          currency: 'ILS',
          category: 'consultant',
          source_type: 'consultant_milestone',
          status: 'prepared',
          notes: data.notes,
          index_type: data.index_type || null,
          index_base_value: data.index_base_value || null,
          index_current_value: data.index_current_value || null,
          index_adjustment_factor: data.index_adjustment_factor || null,
          index_adjusted_amount: data.index_adjusted_amount || null,
        });

      if (error) throw error;
      toast({ title: 'נוצרה בהצלחה', description: 'בקשת התשלום נוספה' });

      // Refetch
      const { data: reqData } = await supabase
        .from('payment_requests')
        .select(`*, payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey (id, name, due_date)`)
        .in('project_advisor_id', projectAdvisorIds)
        .order('created_at', { ascending: false });

      const { data: pas } = await supabase
        .from('project_advisors')
        .select('id, project_id, fee_amount')
        .eq('advisor_id', advisorId)
        .eq('status', 'active');

      const enriched = await enrichRequests(reqData || [], pas as any[], advisorId);
      setRequests(enriched);
    } catch (err) {
      console.error('[AdvisorPaymentsView] Create error:', err);
      toast({ title: 'שגיאה', description: 'לא ניתן ליצור בקשת תשלום', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!advisorId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          לא נמצא פרופיל יועץ.
        </CardContent>
      </Card>
    );
  }

  const ApprovalIcon = ({ approved }: { approved: boolean }) => (
    approved
      ? <Check className="h-4 w-4 text-green-600" />
      : <X className="h-4 w-4 text-muted-foreground/40" />
  );

  return (
    <TooltipProvider>
      <div className="space-y-4" dir="rtl">
        {/* Tax Invoice Alerts */}
        {paidRequests.length > 0 && (
          <div className="space-y-2">
            {paidRequests.map(req => (
              <Alert key={req.id} className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">נדרש: הנפקת חשבונית מס</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-amber-700">
                    התשלום עבור {req.milestone_name || 'בקשה'} אושר ({formatCurrency(req.total_amount || req.amount)}). נא להנפיק חשבונית מס ולהעלותה.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-2 border-amber-400 text-amber-700 hover:bg-amber-100"
                    onClick={() => handleAcknowledgeInvoice(req.id)}
                  >
                    <CheckCircle className="h-3.5 w-3.5 ml-1" />
                    סימון כהונפק
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={!showClosed ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowClosed(false)}
            >
              פתוחות ({requests.filter(r => !terminalStatuses.has(r.status)).length})
            </Button>
            <Button
              variant={showClosed ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowClosed(true)}
            >
              שולם/נדחה ({requests.filter(r => terminalStatuses.has(r.status)).length})
            </Button>
          </div>
          <Button onClick={() => setDialogOpen(true)} disabled={dueMilestones.length === 0}>
            <Plus className="h-4 w-4 ml-1" />
            בקשת תשלום חדשה
          </Button>
        </div>

        {dueMilestones.length === 0 && projectAdvisorIds.length > 0 && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              אין כרגע אבני דרך זמינות להגשת חשבון. אבני דרך מתאפשרות עם השלמת משימות קריטיות.
            </AlertDescription>
          </Alert>
        )}

        {/* Requests Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">יזם</TableHead>
                    <TableHead className="text-right">פרויקט</TableHead>
                    <TableHead className="text-right">תחום</TableHead>
                    <TableHead className="text-right">אבן דרך</TableHead>
                    <TableHead className="text-right">מס׳ חשבון</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">% מצטבר</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild><span>אישור יזם</span></TooltipTrigger>
                        <TooltipContent>אישור מקצועי של היזם</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild><span>הועבר להנה״ח</span></TooltipTrigger>
                        <TooltipContent>הועבר לאישור הנהלת חשבונות</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-right">תשלום לפי חוזה</TableHead>
                    <TableHead className="text-right">תשלום צפוי</TableHead>
                    <TableHead className="text-right">תאריך הגשה</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                        {showClosed ? 'אין בקשות שהושלמו' : 'אין בקשות פתוחות'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.investor_name || '—'}</TableCell>
                        <TableCell>{req.project_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{req.specialty || '—'}</TableCell>
                        <TableCell>{req.milestone_name || '—'}</TableCell>
                        <TableCell className="text-sm">{req.request_number || '—'}</TableCell>
                        <TableCell>{formatCurrency(req.total_amount || req.amount)}</TableCell>
                        <TableCell>
                          {req.cumulative_percent !== undefined
                            ? <span className="text-sm font-medium">{req.cumulative_percent.toFixed(0)}%</span>
                            : '—'}
                        </TableCell>
                        <TableCell><PaymentStatusBadge status={req.status} /></TableCell>
                        <TableCell className="text-center">
                          <ApprovalIcon approved={!!req.is_professionally_approved} />
                        </TableCell>
                        <TableCell className="text-center">
                          <ApprovalIcon approved={!!req.is_transferred_to_accountant} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {req.milestone_due_date
                            ? format(new Date(req.milestone_due_date), 'dd/MM/yyyy', { locale: he })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {req.expected_payment_date
                            ? format(new Date(req.expected_payment_date), 'dd/MM/yyyy', { locale: he })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(req.submitted_at || req.created_at), 'dd/MM/yyyy', { locale: he })}
                        </TableCell>
                        <TableCell>
                          {req.status === 'prepared' ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleSubmitRequest(req.id)}
                              >
                                <Send className="h-3 w-3 ml-1" />
                                הגש
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleDeleteRequest(req.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create dialog in advisor mode */}
        {selectedProjectId && (
          <CreatePaymentRequestDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            projectId={selectedProjectId}
            milestones={dueMilestones}
            onSubmit={handleNewRequest}
            advisorMode
            lockedAdvisorId={projectAdvisorIds[0] || undefined}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

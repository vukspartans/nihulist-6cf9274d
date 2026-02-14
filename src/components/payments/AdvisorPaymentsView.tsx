import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { CreatePaymentRequestDialog } from './CreatePaymentRequestDialog';
import { PaymentMilestone, PaymentRequest } from '@/types/payment';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, AlertTriangle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface AdvisorPaymentRequest extends PaymentRequest {
  project_name?: string;
  milestone_name?: string;
}

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
  // We need a projectId for CreatePaymentRequestDialog — pick from the first due milestone
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Fetch advisor data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get advisor record
        const { data: advisor } = await supabase
          .from('advisors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!advisor) {
          setLoading(false);
          return;
        }
        setAdvisorId(advisor.id);

        // 2. Get project_advisor records
        const { data: pas } = await supabase
          .from('project_advisors')
          .select('id, project_id')
          .eq('advisor_id', advisor.id)
          .eq('status', 'active');

        const paIds = (pas || []).map(pa => pa.id);
        setProjectAdvisorIds(paIds);

        if (paIds.length === 0) {
          setLoading(false);
          return;
        }

        // 3. Fetch payment requests for these project_advisor_ids
        const { data: reqData } = await supabase
          .from('payment_requests')
          .select(`
            *,
            payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey (id, name)
          `)
          .in('project_advisor_id', paIds)
          .order('created_at', { ascending: false });

        // Get project names
        const projectIds = [...new Set((pas || []).map(pa => pa.project_id))];
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);

        const projectMap = new Map((projects || []).map(p => [p.id, p.name]));
        const paProjectMap = new Map((pas || []).map(pa => [pa.id, pa.project_id]));

        const enriched: AdvisorPaymentRequest[] = (reqData || []).map(r => ({
          ...r,
          project_name: projectMap.get(paProjectMap.get(r.project_advisor_id || '') || '') || '',
          milestone_name: r.payment_milestone?.name || '',
        })) as AdvisorPaymentRequest[];

        setRequests(enriched);

        // 4. Fetch due milestones for "New Request" dialog
        const { data: milestoneData } = await supabase
          .from('payment_milestones')
          .select('*')
          .in('project_advisor_id', paIds)
          .eq('status', 'due');

        setDueMilestones((milestoneData as PaymentMilestone[]) || []);

        // Set a default project ID from milestones or project_advisors
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
  }, [user]);

  const terminalStatuses = useMemo(() => new Set(['paid', 'rejected']), []);

  const filteredRequests = useMemo(() => {
    if (showClosed) {
      return requests.filter(r => terminalStatuses.has(r.status));
    }
    return requests.filter(r => !terminalStatuses.has(r.status));
  }, [requests, showClosed, terminalStatuses]);

  const paidRequests = useMemo(
    () => requests.filter(r => r.status === 'paid' && !acknowledgedInvoices.has(r.id)),
    [requests, acknowledgedInvoices]
  );

  const handleAcknowledgeInvoice = (requestId: string) => {
    setAcknowledgedInvoices(prev => new Set(prev).add(requestId));
    toast({ title: 'סומן כהונפק', description: 'חשבונית המס סומנה כהונפקה.' });
  };

  const handleNewRequest = async (data: Partial<PaymentRequest>) => {
    if (!selectedProjectId) return;
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
        .select(`*, payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey (id, name)`)
        .in('project_advisor_id', projectAdvisorIds)
        .order('created_at', { ascending: false });

      const { data: pas } = await supabase
        .from('project_advisors')
        .select('id, project_id')
        .eq('advisor_id', advisorId!)
        .eq('status', 'active');

      const projectIds = [...new Set((pas || []).map(pa => pa.project_id))];
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      const projectMap = new Map((projects || []).map(p => [p.id, p.name]));
      const paProjectMap = new Map((pas || []).map(pa => [pa.id, pa.project_id]));

      setRequests((reqData || []).map(r => ({
        ...r,
        project_name: projectMap.get(paProjectMap.get(r.project_advisor_id || '') || '') || '',
        milestone_name: r.payment_milestone?.name || '',
      })) as AdvisorPaymentRequest[]);
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

  return (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">פרויקט</TableHead>
                <TableHead className="text-right">אבן דרך</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {showClosed ? 'אין בקשות שהושלמו' : 'אין בקשות פתוחות'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.project_name}</TableCell>
                    <TableCell>{req.milestone_name || '—'}</TableCell>
                    <TableCell>{formatCurrency(req.total_amount || req.amount)}</TableCell>
                    <TableCell><PaymentStatusBadge status={req.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(req.submitted_at || req.created_at), 'dd/MM/yyyy', { locale: he })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
  );
}

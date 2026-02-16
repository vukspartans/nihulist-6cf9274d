import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AccountantRequest {
  id: string;
  project_id: string;
  project_name: string;
  project_advisor_id: string | null;
  advisor_company_name: string | null;
  payment_milestone_id: string | null;
  milestone_name: string | null;
  milestone_due_date: string | null;
  amount: number;
  total_amount: number | null;
  currency: string;
  status: string;
  submitted_at: string | null;
  paid_at: string | null;
  expected_payment_date: string | null;
  invoice_file_url: string | null;
  created_at: string;
}

export interface VendorSummary {
  advisorId: string;
  companyName: string;
  totalPaidYTD: number;
  totalOutstanding: number;
  requests: AccountantRequest[];
}

export function useAccountantData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allRequests, setAllRequests] = useState<AccountantRequest[]>([]);
  const [vendorSummaries, setVendorSummaries] = useState<VendorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch all projects owned by user
      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user.id)
        .neq('status', 'deleted');

      if (projErr) throw projErr;
      if (!projects || projects.length === 0) {
        setAllRequests([]);
        setVendorSummaries([]);
        setLoading(false);
        return;
      }

      const projectIds = projects.map(p => p.id);
      const projectMap = new Map(projects.map(p => [p.id, p.name]));

      // 2. Fetch all payment requests for those projects
      const { data: requests, error: reqErr } = await supabase
        .from('payment_requests')
        .select(`
          id, project_id, project_advisor_id, payment_milestone_id,
          amount, total_amount, currency, status,
          submitted_at, paid_at, expected_payment_date, invoice_file_url, created_at,
          project_advisor:project_advisors!payment_requests_project_advisor_id_fkey (
            id, advisor_id,
            advisors!fk_project_advisors_advisor ( id, company_name )
          ),
          payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey (
            id, name, due_date
          )
        `)
        .in('project_id', projectIds)
        .neq('status', 'prepared')
        .order('created_at', { ascending: false });

      if (reqErr) throw reqErr;

      const mapped: AccountantRequest[] = (requests || []).map((r: any) => ({
        id: r.id,
        project_id: r.project_id,
        project_name: projectMap.get(r.project_id) || '',
        project_advisor_id: r.project_advisor_id,
        advisor_company_name: r.project_advisor?.advisors?.company_name || null,
        payment_milestone_id: r.payment_milestone_id,
        milestone_name: r.payment_milestone?.name || null,
        milestone_due_date: r.payment_milestone?.due_date || null,
        amount: r.amount,
        total_amount: r.total_amount,
        currency: r.currency,
        status: r.status,
        submitted_at: r.submitted_at,
        paid_at: r.paid_at,
        expected_payment_date: r.expected_payment_date,
        invoice_file_url: r.invoice_file_url || null,
        created_at: r.created_at,
      }));

      setAllRequests(mapped);

      // 3. Compute vendor summaries
      const currentYear = new Date().getFullYear();
      const vendorMap = new Map<string, VendorSummary>();

      mapped.forEach(req => {
        if (!req.project_advisor_id || !req.advisor_company_name) return;
        const key = req.project_advisor_id;
        if (!vendorMap.has(key)) {
          vendorMap.set(key, {
            advisorId: req.project_advisor_id,
            companyName: req.advisor_company_name,
            totalPaidYTD: 0,
            totalOutstanding: 0,
            requests: [],
          });
        }
        const v = vendorMap.get(key)!;
        v.requests.push(req);
        const amt = req.total_amount || req.amount;
        if (req.status === 'paid' && req.paid_at) {
          const paidYear = new Date(req.paid_at).getFullYear();
          if (paidYear === currentYear) v.totalPaidYTD += amt;
        } else if (req.status !== 'rejected') {
          v.totalOutstanding += amt;
        }
      });

      const summaries = Array.from(vendorMap.values())
        .sort((a, b) => b.totalOutstanding - a.totalOutstanding);
      setVendorSummaries(summaries);
    } catch (error) {
      console.error('[useAccountantData] Error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון נתונים פיננסיים',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateExpectedDate = async (requestId: string, date: string | null) => {
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ expected_payment_date: date } as any)
        .eq('id', requestId);

      if (error) throw error;

      setAllRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, expected_payment_date: date } : r)
      );
    } catch (error) {
      console.error('[useAccountantData] Error updating date:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן תאריך תשלום צפוי',
        variant: 'destructive',
      });
    }
  };

  const updateRequestStatus = async (requestId: string, status: string, additionalData?: any) => {
    try {
      const updateData: any = { status, ...additionalData };
      if (status === 'paid' && !updateData.paid_at) updateData.paid_at = new Date().toISOString();
      else if (status === 'rejected') updateData.rejected_at = new Date().toISOString();
      else if (status !== 'prepared' && status !== 'submitted') {
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('payment_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Send payment notification (non-blocking)
      if (status === 'paid') {
        supabase.functions.invoke('notify-payment-status', {
          body: { type: 'payment_marked_paid', payment_request_id: requestId },
        }).catch(err => console.warn('[Accountant] Notification failed:', err));
      }

      toast({ title: 'עודכן', description: 'סטטוס הבקשה עודכן בהצלחה' });
      await fetchData();
    } catch (error) {
      console.error('[useAccountantData] Error updating status:', error);
      toast({ title: 'שגיאה', description: 'לא ניתן לעדכן סטטוס', variant: 'destructive' });
    }
  };

  return {
    allRequests,
    vendorSummaries,
    loading,
    updateExpectedDate,
    updateRequestStatus,
    refetch: fetchData,
  };
}

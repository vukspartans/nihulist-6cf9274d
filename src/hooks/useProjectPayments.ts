import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PaymentMilestone, PaymentRequest, PaymentSummary } from '@/types/payment';

export function useProjectPayments(projectId: string) {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalBudget: 0,
    totalPaid: 0,
    totalPending: 0,
    totalRemaining: 0,
  });

  const fetchMilestones = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_milestones')
        .select(`
          *,
          project_advisor:project_advisors!payment_milestones_project_advisor_id_fkey (
            id,
            advisor_id,
            fee_amount,
            advisors!fk_project_advisors_advisor (
              id,
              company_name,
              logo_url
            )
          )
        `)
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMilestones((data as PaymentMilestone[]) || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  }, [projectId]);

  const fetchPaymentRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          project_advisor:project_advisors!payment_requests_project_advisor_id_fkey (
            id,
            advisor_id,
            advisors!fk_project_advisors_advisor (
              id,
              company_name,
              logo_url
            )
          ),
          payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey (
            id,
            name
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentRequests((data as PaymentRequest[]) || []);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    }
  }, [projectId]);

  const calculateSummary = useCallback(async () => {
    try {
      // Get project advisors budget
      const { data: projectData } = await supabase
        .from('projects')
        .select('advisors_budget')
        .eq('id', projectId)
        .single();

      const totalBudget = projectData?.advisors_budget || 0;

      // Calculate paid amount from payment requests
      const paidRequests = paymentRequests.filter(r => r.status === 'paid');
      const totalPaid = paidRequests.reduce((sum, r) => sum + (r.total_amount || r.amount), 0);

      // Calculate pending (anything not paid, rejected, or prepared)
      const pendingRequests = paymentRequests.filter(r => 
        r.status !== 'paid' && r.status !== 'rejected' && r.status !== 'prepared'
      );
      const totalPending = pendingRequests.reduce((sum, r) => sum + (r.total_amount || r.amount), 0);

      const totalRemaining = totalBudget - totalPaid - totalPending;

      setSummary({
        totalBudget,
        totalPaid,
        totalPending,
        totalRemaining: Math.max(0, totalRemaining),
      });
    } catch (error) {
      console.error('Error calculating summary:', error);
    }
  }, [projectId, paymentRequests]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMilestones(), fetchPaymentRequests()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMilestones, fetchPaymentRequests]);

  useEffect(() => {
    calculateSummary();
  }, [calculateSummary]);

  const createMilestone = async (milestone: Partial<PaymentMilestone>) => {
    try {
      const { data, error } = await supabase
        .from('payment_milestones')
        .insert({
          project_id: projectId,
          name: milestone.name,
          amount: milestone.amount,
          currency: milestone.currency || 'ILS',
          trigger_type: milestone.trigger_type || 'manual',
          due_date: milestone.due_date,
          project_advisor_id: milestone.project_advisor_id,
          description: milestone.description,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "נוצרה בהצלחה",
        description: "אבן הדרך לתשלום נוספה",
      });
      
      await fetchMilestones();
      return data;
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור אבן דרך",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateMilestoneStatus = async (milestoneId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('payment_milestones')
        .update({ status })
        .eq('id', milestoneId);

      if (error) throw error;
      await fetchMilestones();
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את אבן הדרך",
        variant: "destructive",
      });
    }
  };

  const createPaymentRequest = async (request: Partial<PaymentRequest>) => {
    try {
      const vatPercent = request.vat_percent ?? 17;
      const amount = request.amount || 0;
      
      // Use index-adjusted amount for VAT calculation if present
      const baseForVat = request.index_adjusted_amount ?? amount;
      const vatAmount = baseForVat * (vatPercent / 100);
      const totalAmount = baseForVat + vatAmount;

      const { data, error } = await supabase
        .from('payment_requests')
        .insert({
          project_id: projectId,
          project_advisor_id: request.project_advisor_id,
          payment_milestone_id: request.payment_milestone_id,
          amount: amount,
          vat_percent: vatPercent,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          currency: request.currency || 'ILS',
          category: request.category || 'consultant',
          source_type: request.source_type || 'consultant_milestone',
          status: 'prepared',
          notes: request.notes,
          external_party_name: request.external_party_name,
          invoice_file_url: request.invoice_file_url,
          index_type: request.index_type || null,
          index_base_value: request.index_base_value || null,
          index_current_value: request.index_current_value || null,
          index_adjustment_factor: request.index_adjustment_factor || null,
          index_adjusted_amount: request.index_adjusted_amount || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "נוצרה בהצלחה",
        description: "בקשת התשלום נוספה",
      });

      await fetchPaymentRequests();
      return data;
    } catch (error) {
      console.error('Error creating payment request:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור בקשת תשלום",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePaymentRequestStatus = async (
    requestId: string, 
    status: string, 
    additionalData?: Partial<PaymentRequest>
  ) => {
    try {
      const updateData: any = { status, ...additionalData };
      
      // Set timestamp based on status
      if (status === 'submitted') {
        updateData.submitted_at = new Date().toISOString();
      } else if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      } else if (status !== 'prepared') {
        // Any approval step: set approved_at timestamp
        updateData.approved_at = new Date().toISOString();
        if (additionalData?.approver_signature_id) {
          updateData.approver_signature_id = additionalData.approver_signature_id;
        }
      }

      const { error } = await supabase
        .from('payment_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Send notification for status change
      try {
        if (status === 'paid') {
          await supabase.functions.invoke('notify-payment-status', {
            body: { type: 'payment_marked_paid', payment_request_id: requestId },
          });
        } else if (status !== 'prepared' && status !== 'rejected') {
          await supabase.functions.invoke('notify-payment-status', {
            body: { type: 'status_changed', payment_request_id: requestId },
          });
        }
      } catch (notifyErr) {
        console.warn('[Payment] Notification send failed (non-blocking):', notifyErr);
      }

      toast({
        title: "הבקשה הועברה",
        description: "סטטוס עודכן: הודעה נשלחה לגורם הרלוונטי",
      });

      await fetchPaymentRequests();
    } catch (error) {
      console.error('Error updating payment request:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את בקשת התשלום",
        variant: "destructive",
      });
    }
  };

  const deletePaymentRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('payment_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "נמחקה בהצלחה",
        description: "בקשת התשלום נמחקה",
      });

      await fetchPaymentRequests();
    } catch (error) {
      console.error('Error deleting payment request:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את בקשת התשלום",
        variant: "destructive",
      });
    }
  };

  const refetch = useCallback(async () => {
    await Promise.all([fetchMilestones(), fetchPaymentRequests()]);
  }, [fetchMilestones, fetchPaymentRequests]);

  return {
    milestones,
    paymentRequests,
    summary,
    loading,
    createMilestone,
    updateMilestoneStatus,
    createPaymentRequest,
    updatePaymentRequestStatus,
    deletePaymentRequest,
    refetch,
  };
}

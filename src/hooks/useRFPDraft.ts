import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdvisorTypeRequestData, ServiceScopeItem, RFPFeeItem, PaymentTerms, MilestonePayment } from '@/types/rfpRequest';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

interface RFPDraftRow {
  id: string;
  project_id: string;
  user_id: string;
  advisor_type: string;
  request_title: string | null;
  request_content: string | null;
  request_attachments: Json;
  service_details_mode: string | null;
  service_details_free_text: string | null;
  service_details_file: Json;
  service_scope_items: Json;
  fee_items: Json;
  optional_fee_items: Json;
  payment_terms: Json;
  has_been_reviewed: boolean | null;
  created_at: string;
  updated_at: string;
}

export const useRFPDraft = (projectId: string) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveDraft = useCallback(async (
    advisorType: string, 
    data: AdvisorTypeRequestData
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const draftData = {
        project_id: projectId,
        user_id: user.id,
        advisor_type: advisorType,
        request_title: data.requestTitle || null,
        request_content: data.requestContent || null,
        request_attachments: (data.requestAttachments || []) as unknown as Json,
        service_details_mode: data.serviceDetailsMode || 'free_text',
        service_details_free_text: data.serviceDetailsFreeText || null,
        service_details_file: (data.serviceDetailsFile || null) as unknown as Json,
        service_scope_items: (data.serviceScopeItems || []) as unknown as Json,
        fee_items: (data.feeItems || []) as unknown as Json,
        optional_fee_items: (data.optionalFeeItems || []) as unknown as Json,
        payment_terms: (data.paymentTerms || {}) as unknown as Json,
        has_been_reviewed: data.hasBeenReviewed || false,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('rfp_request_drafts')
        .upsert([draftData], {
          onConflict: 'project_id,advisor_type,user_id'
        });

      if (error) {
        console.error('[useRFPDraft] Save error:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('[useRFPDraft] Failed to save draft:', error);
      toast({
        title: 'שגיאה בשמירת הטיוטה',
        description: 'לא ניתן לשמור את הנתונים. נסה שוב.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [projectId, toast]);

  const parseServiceScopeItems = (data: Json): ServiceScopeItem[] => {
    if (!Array.isArray(data)) return [];
    return data.map((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return {
        id: String(obj.id || ''),
        task_name: String(obj.task_name || ''),
        is_included: Boolean(obj.is_included ?? true),
        fee_category: String(obj.fee_category || 'כללי'),
        is_optional: Boolean(obj.is_optional ?? false),
        display_order: Number(obj.display_order || 0)
      };
    });
  };

  const parseFeeItems = (data: Json): RFPFeeItem[] => {
    if (!Array.isArray(data)) return [];
    return data.map((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return {
        id: obj.id ? String(obj.id) : undefined,
        item_number: Number(obj.item_number || 0),
        description: String(obj.description || ''),
        unit: (obj.unit as RFPFeeItem['unit']) || 'lump_sum',
        quantity: Number(obj.quantity ?? 1),
        unit_price: obj.unit_price != null ? Number(obj.unit_price) : undefined,
        charge_type: (obj.charge_type as RFPFeeItem['charge_type']) || 'one_time',
        is_optional: Boolean(obj.is_optional ?? false),
        display_order: Number(obj.display_order || 0)
      };
    });
  };

  const parsePaymentTerms = (data: Json): PaymentTerms => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { milestone_payments: [], payment_term_type: 'net_30' };
    }
    const obj = data as Record<string, unknown>;
    const milestones = Array.isArray(obj.milestone_payments)
      ? obj.milestone_payments.map((m: unknown) => {
          const mObj = m as Record<string, unknown>;
          return {
            description: String(mObj.description || ''),
            percentage: Number(mObj.percentage ?? mObj.percent ?? 0),
            trigger: mObj.trigger ? String(mObj.trigger) : undefined
          } as MilestonePayment;
        })
      : undefined;

    return {
      advance_percent: obj.advance_percent != null && Number(obj.advance_percent) > 0 
        ? Number(obj.advance_percent) 
        : undefined,
      milestone_payments: milestones,
      payment_term_type: obj.payment_term_type as PaymentTerms['payment_term_type'],
      payment_due_days: obj.payment_due_days != null ? Number(obj.payment_due_days) : undefined,
      notes: obj.notes ? String(obj.notes) : undefined
    };
  };

  const rowToData = (draft: RFPDraftRow): AdvisorTypeRequestData => {
    const attachments = Array.isArray(draft.request_attachments) 
      ? (draft.request_attachments as Array<{name: string; url: string; size: number; path: string}>)
      : [];
    
    const serviceFile = draft.service_details_file && typeof draft.service_details_file === 'object' && !Array.isArray(draft.service_details_file)
      ? draft.service_details_file as { name: string; url: string; size: number; path: string }
      : undefined;

    return {
      requestTitle: draft.request_title || '',
      requestContent: draft.request_content || '',
      requestAttachments: attachments,
      hasBeenReviewed: draft.has_been_reviewed ?? false,
      serviceDetailsMode: (draft.service_details_mode as 'free_text' | 'file' | 'checklist') || 'free_text',
      serviceDetailsFreeText: draft.service_details_free_text || '',
      serviceDetailsFile: serviceFile,
      serviceScopeItems: parseServiceScopeItems(draft.service_scope_items),
      feeItems: parseFeeItems(draft.fee_items),
      optionalFeeItems: parseFeeItems(draft.optional_fee_items),
      paymentTerms: parsePaymentTerms(draft.payment_terms)
    };
  };

  const loadDraft = useCallback(async (
    advisorType: string
  ): Promise<AdvisorTypeRequestData | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('rfp_request_drafts')
        .select('*')
        .eq('project_id', projectId)
        .eq('advisor_type', advisorType)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useRFPDraft] Load error:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return rowToData(data as RFPDraftRow);
    } catch (error) {
      console.error('[useRFPDraft] Failed to load draft:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadAllDrafts = useCallback(async (): Promise<Record<string, AdvisorTypeRequestData>> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {};
      }

      const { data, error } = await supabase
        .from('rfp_request_drafts')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useRFPDraft] Load all error:', error);
        return {};
      }

      const draftsMap: Record<string, AdvisorTypeRequestData> = {};
      
      for (const row of (data || [])) {
        const draft = row as RFPDraftRow;
        draftsMap[draft.advisor_type] = rowToData(draft);
      }

      return draftsMap;
    } catch (error) {
      console.error('[useRFPDraft] Failed to load all drafts:', error);
      return {};
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const deleteDraft = useCallback(async (advisorType: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return false;
      }

      const { error } = await supabase
        .from('rfp_request_drafts')
        .delete()
        .eq('project_id', projectId)
        .eq('advisor_type', advisorType)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useRFPDraft] Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[useRFPDraft] Failed to delete draft:', error);
      return false;
    }
  }, [projectId]);

  const deleteAllDrafts = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return false;
      }

      const { error } = await supabase
        .from('rfp_request_drafts')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useRFPDraft] Delete all error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[useRFPDraft] Failed to delete all drafts:', error);
      return false;
    }
  }, [projectId]);

  return {
    saveDraft,
    loadDraft,
    loadAllDrafts,
    deleteDraft,
    deleteAllDrafts,
    saving,
    loading
  };
};

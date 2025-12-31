import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdvisorTypeRequestData, ServiceScopeItem, RFPFeeItem, PaymentTerms, MilestonePayment, ServiceDetailsMode, UploadedFileMetadata } from '@/types/rfpRequest';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

interface InviteData {
  id: string;
  advisor_id: string | null;
  advisor_type: string | null;
  request_title: string | null;
  request_content: string | null;
  request_files: Json;
  service_details_mode: string | null;
  service_details_text: string | null;
  service_details_file: Json;
  payment_terms: Json;
  rfp_request_fee_items?: any[];
  rfp_service_scope_items?: any[];
}

/**
 * Hook for saving RFP data directly to permanent tables (rfp_invites, rfp_request_fee_items, etc.)
 * Eliminates the need for the intermediate rfp_request_drafts table
 */
export const useRFPDirectSave = (projectId: string) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Create or get draft RFP for this project
   */
  const getOrCreateDraftRFP = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for existing draft RFP
      const { data: existingRFP, error: fetchError } = await supabase
        .from('rfps')
        .select('id')
        .eq('project_id', projectId)
        .eq('sent_by', user.id)
        .eq('status', 'draft')
        .maybeSingle();

      if (fetchError) {
        console.error('[useRFPDirectSave] Error fetching draft RFP:', fetchError);
        return null;
      }

      if (existingRFP) {
        return existingRFP.id;
      }

      // Create new draft RFP
      const { data: newRFP, error: createError } = await supabase
        .from('rfps')
        .insert([{
          project_id: projectId,
          sent_by: user.id,
          status: 'draft',
          subject: 'טיוטה',
          body_html: ''
        }])
        .select('id')
        .single();

      if (createError) {
        console.error('[useRFPDirectSave] Error creating draft RFP:', createError);
        return null;
      }

      return newRFP.id;
    } catch (error) {
      console.error('[useRFPDirectSave] getOrCreateDraftRFP error:', error);
      return null;
    }
  }, [projectId]);

  /**
   * Save advisor type data directly to rfp_invites and related tables
   */
  const saveDirectly = useCallback(async (
    advisorType: string,
    advisorId: string | null,
    data: AdvisorTypeRequestData
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get or create draft RFP
      const rfpId = await getOrCreateDraftRFP();
      if (!rfpId) {
        throw new Error('Could not get or create draft RFP');
      }

      // Check if invite already exists for this advisor type
      const { data: existingInvite, error: fetchError } = await supabase
        .from('rfp_invites')
        .select('id')
        .eq('rfp_id', rfpId)
        .eq('advisor_type', advisorType)
        .maybeSingle();

      if (fetchError) {
        console.error('[useRFPDirectSave] Error checking existing invite:', fetchError);
      }

      let inviteId: string;

      const inviteData = {
        rfp_id: rfpId,
        advisor_type: advisorType,
        advisor_id: advisorId,
        email: 'draft@placeholder.com', // Placeholder, will be updated when sending
        submit_token: `draft_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'draft' as const,
        request_title: data.requestTitle || null,
        request_content: data.requestContent || null,
        request_files: (data.requestAttachments || []) as unknown as Json,
        service_details_mode: data.serviceDetailsMode || 'free_text',
        service_details_text: data.serviceDetailsFreeText || null,
        service_details_file: (data.serviceDetailsFile || null) as unknown as Json,
        payment_terms: (data.paymentTerms || {}) as unknown as Json
      };

      if (existingInvite) {
        // Update existing invite
        inviteId = existingInvite.id;
        const { error: updateError } = await supabase
          .from('rfp_invites')
          .update({
            request_title: inviteData.request_title,
            request_content: inviteData.request_content,
            request_files: inviteData.request_files,
            service_details_mode: inviteData.service_details_mode,
            service_details_text: inviteData.service_details_text,
            service_details_file: inviteData.service_details_file,
            payment_terms: inviteData.payment_terms
          })
          .eq('id', inviteId);

        if (updateError) {
          console.error('[useRFPDirectSave] Error updating invite:', updateError);
          throw updateError;
        }
      } else {
        // Create new invite
        const { data: newInvite, error: insertError } = await supabase
          .from('rfp_invites')
          .insert(inviteData)
          .select('id')
          .single();

        if (insertError) {
          console.error('[useRFPDirectSave] Error creating invite:', insertError);
          throw insertError;
        }
        inviteId = newInvite.id;
      }

      // Delete and re-insert fee items
      await supabase
        .from('rfp_request_fee_items')
        .delete()
        .eq('rfp_invite_id', inviteId);

      const allFeeItems = [
        ...(data.feeItems || []).map(item => ({ ...item, is_optional: false })),
        ...(data.optionalFeeItems || []).map(item => ({ ...item, is_optional: true }))
      ];

      if (allFeeItems.length > 0) {
        const feeItemsToInsert = allFeeItems.map((item, index) => ({
          rfp_invite_id: inviteId,
          item_number: item.item_number || index + 1,
          description: item.description,
          unit: item.unit || 'lump_sum',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || null,
          charge_type: item.charge_type || 'one_time',
          is_optional: item.is_optional || false,
          display_order: item.display_order || index
        }));

        const { error: feeError } = await supabase
          .from('rfp_request_fee_items')
          .insert(feeItemsToInsert);

        if (feeError) {
          console.error('[useRFPDirectSave] Error inserting fee items:', feeError);
        }
      }

      // Delete and re-insert service scope items (checklist mode)
      await supabase
        .from('rfp_service_scope_items')
        .delete()
        .eq('rfp_invite_id', inviteId);

      if (data.serviceDetailsMode === 'checklist' && data.serviceScopeItems && data.serviceScopeItems.length > 0) {
        const scopeItemsToInsert = data.serviceScopeItems.map((item, index) => ({
          rfp_invite_id: inviteId,
          task_name: item.task_name,
          is_included: item.is_included,
          is_optional: item.is_optional,
          fee_category: item.fee_category,
          display_order: item.display_order || index
        }));

        const { error: scopeError } = await supabase
          .from('rfp_service_scope_items')
          .insert(scopeItemsToInsert);

        if (scopeError) {
          console.error('[useRFPDirectSave] Error inserting scope items:', scopeError);
        }
      }

      console.log('[useRFPDirectSave] Successfully saved data for advisor type:', advisorType);
      return true;
    } catch (error) {
      console.error('[useRFPDirectSave] Failed to save:', error);
      toast({
        title: 'שגיאה בשמירה',
        description: 'לא ניתן לשמור את הנתונים. נסה שוב.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [getOrCreateDraftRFP, toast]);

  /**
   * Load saved data for an advisor type from rfp_invites
   */
  const loadSavedData = useCallback(async (
    advisorType: string
  ): Promise<AdvisorTypeRequestData | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Find draft RFP
      const { data: draftRFP } = await supabase
        .from('rfps')
        .select('id')
        .eq('project_id', projectId)
        .eq('sent_by', user.id)
        .eq('status', 'draft')
        .maybeSingle();

      if (!draftRFP) return null;

      // Find invite for this advisor type
      const { data: invite, error } = await supabase
        .from('rfp_invites')
        .select(`
          *,
          rfp_request_fee_items(*),
          rfp_service_scope_items(*)
        `)
        .eq('rfp_id', draftRFP.id)
        .eq('advisor_type', advisorType)
        .maybeSingle();

      if (error || !invite) return null;

      // Parse and return data
      return parseInviteToData(invite as InviteData);
    } catch (error) {
      console.error('[useRFPDirectSave] Failed to load:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * Load all saved data for all advisor types
   */
  const loadAllSavedData = useCallback(async (): Promise<Record<string, AdvisorTypeRequestData>> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      // Find draft RFP
      const { data: draftRFP } = await supabase
        .from('rfps')
        .select('id')
        .eq('project_id', projectId)
        .eq('sent_by', user.id)
        .eq('status', 'draft')
        .maybeSingle();

      if (!draftRFP) return {};

      // Get all invites for this draft
      const { data: invites, error } = await supabase
        .from('rfp_invites')
        .select(`
          *,
          rfp_request_fee_items(*),
          rfp_service_scope_items(*)
        `)
        .eq('rfp_id', draftRFP.id)
        .eq('status', 'draft');

      if (error || !invites) return {};

      const result: Record<string, AdvisorTypeRequestData> = {};
      for (const invite of invites) {
        if (invite.advisor_type) {
          result[invite.advisor_type] = parseInviteToData(invite as InviteData);
        }
      }

      return result;
    } catch (error) {
      console.error('[useRFPDirectSave] Failed to load all:', error);
      return {};
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * Get the draft RFP ID if it exists
   */
  const getDraftRFPId = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: draftRFP } = await supabase
        .from('rfps')
        .select('id')
        .eq('project_id', projectId)
        .eq('sent_by', user.id)
        .eq('status', 'draft')
        .maybeSingle();

      return draftRFP?.id || null;
    } catch (error) {
      console.error('[useRFPDirectSave] getDraftRFPId error:', error);
      return null;
    }
  }, [projectId]);

  /**
   * Delete all draft data for this project
   */
  const deleteAllDraftData = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Find and delete draft RFP (cascade will handle invites and related data)
      const { error } = await supabase
        .from('rfps')
        .delete()
        .eq('project_id', projectId)
        .eq('sent_by', user.id)
        .eq('status', 'draft');

      if (error) {
        console.error('[useRFPDirectSave] Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[useRFPDirectSave] Failed to delete:', error);
      return false;
    }
  }, [projectId]);

  return {
    getOrCreateDraftRFP,
    saveDirectly,
    loadSavedData,
    loadAllSavedData,
    getDraftRFPId,
    deleteAllDraftData,
    saving,
    loading
  };
};

// Helper function to parse invite data to AdvisorTypeRequestData
function parseInviteToData(invite: InviteData): AdvisorTypeRequestData {
  const attachments = Array.isArray(invite.request_files)
    ? (invite.request_files as Array<{ name: string; url: string; size: number; path: string }>)
    : [];

  const serviceFile = invite.service_details_file && typeof invite.service_details_file === 'object' && !Array.isArray(invite.service_details_file)
    ? invite.service_details_file as { name: string; url: string; size: number; path: string }
    : undefined;

  // Parse fee items
  const feeItems: RFPFeeItem[] = [];
  const optionalFeeItems: RFPFeeItem[] = [];

  if (invite.rfp_request_fee_items) {
    for (const item of invite.rfp_request_fee_items) {
      const feeItem: RFPFeeItem = {
        id: item.id,
        item_number: item.item_number,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        charge_type: item.charge_type,
        is_optional: item.is_optional,
        display_order: item.display_order
      };

      if (item.is_optional) {
        optionalFeeItems.push(feeItem);
      } else {
        feeItems.push(feeItem);
      }
    }
  }

  // Parse service scope items
  const serviceScopeItems: ServiceScopeItem[] = (invite.rfp_service_scope_items || []).map((item: any) => ({
    id: item.id,
    task_name: item.task_name,
    is_included: item.is_included,
    fee_category: item.fee_category,
    is_optional: item.is_optional,
    display_order: item.display_order
  }));

  // Parse payment terms
  const paymentTerms = parsePaymentTerms(invite.payment_terms);

  return {
    requestTitle: invite.request_title || '',
    requestContent: invite.request_content || '',
    requestAttachments: attachments,
    hasBeenReviewed: true, // If we have data, it was reviewed
    serviceDetailsMode: (invite.service_details_mode as ServiceDetailsMode) || 'free_text',
    serviceDetailsFreeText: invite.service_details_text || '',
    serviceDetailsFile: serviceFile,
    serviceScopeItems,
    feeItems,
    optionalFeeItems,
    paymentTerms
  };
}

function parsePaymentTerms(data: Json): PaymentTerms {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { advance_percent: 20, payment_due_days: 30 };
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
    advance_percent: obj.advance_percent != null ? Number(obj.advance_percent) : undefined,
    milestone_payments: milestones,
    payment_term_type: obj.payment_term_type as PaymentTerms['payment_term_type'],
    payment_due_days: obj.payment_due_days != null ? Number(obj.payment_due_days) : undefined,
    notes: obj.notes ? String(obj.notes) : undefined
  };
}

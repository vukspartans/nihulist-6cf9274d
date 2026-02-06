import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/utils/errorHandling';
import { DEADLINES } from '@/utils/constants';
import { ServiceScopeItem, RFPFeeItem, PaymentTerms, ServiceDetailsMode } from '@/types/rfpRequest';

interface RFPResult {
  result_rfp_id: string;
  result_invites_sent: number;
}

interface ServiceDetailsData {
  mode: ServiceDetailsMode;
  freeText?: string;
  file?: { name: string; url: string; size: number; path: string };
  scopeItems?: ServiceScopeItem[];
}

interface AdvisorTypeData {
  requestTitle?: string;
  requestContent?: string;
  requestFiles?: Array<{name: string, url: string, size: number, path: string}>;
  serviceDetails?: ServiceDetailsData;
  feeItems?: RFPFeeItem[];
  optionalFeeItems?: RFPFeeItem[];
  paymentTerms?: PaymentTerms;
}

export const useRFP = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Send RFP invitations to selected advisors
   * @param projectId - UUID of the project
   * @param advisorTypePairs - Array of {advisor_id, advisor_type} objects
   * @param deadlineHours - Hours until deadline (default: 168 = 7 days)
   * @param emailSubject - Custom email subject (optional)
   * @param emailBodyHtml - Custom email body HTML (optional)
   * @param requestTitle - Request title for advisors (optional)
   * @param requestContent - Request content for advisors (optional)
   * @param requestFiles - Uploaded file metadata (optional)
   * @param advisorTypeDataMap - Map of advisor_type to additional data (service details, fees, payment terms)
   * @returns RFPResult with rfp_id and invites_sent count
   */
  const sendRFPInvitations = async (
    projectId: string,
    advisorTypePairs: Array<{advisor_id: string, advisor_type: string}>,
    deadlineHours: number = DEADLINES.DEFAULT_RFP_HOURS,
    emailSubject?: string,
    emailBodyHtml?: string,
    requestTitle?: string,
    requestContent?: string,
    requestFiles?: Array<{name: string, url: string, size: number, path: string}>,
    advisorTypeDataMap?: Record<string, AdvisorTypeData>
  ): Promise<RFPResult | null> => {
    // Validate advisor selection
    if (!advisorTypePairs || advisorTypePairs.length === 0) {
      toast({
        title: "שגיאה",
        description: "לא נבחרו יועצים. אנא בחר לפחות יועץ אחד.",
        variant: "destructive",
      });
      return null;
    }

    console.log('[useRFP] Sending RFP to advisors:', {
      projectId,
      pairsCount: advisorTypePairs.length,
      uniqueAdvisors: new Set(advisorTypePairs.map(p => p.advisor_id)).size,
      deadline: deadlineHours,
      hasAdvisorTypeData: !!advisorTypeDataMap
    });

    setLoading(true);

    try {
      // Prepare request files for database - pass as array directly (JSONB handles it)
      const requestFilesArray = requestFiles 
        ? requestFiles.map(f => ({ name: f.name, url: f.url, size: f.size, path: f.path }))
        : null;

      const { data, error } = await supabase.rpc('send_rfp_invitations_to_advisors', {
        project_uuid: projectId,
        advisor_type_pairs: advisorTypePairs,
        deadline_hours: deadlineHours,
        email_subject: emailSubject || null,
        email_body_html: emailBodyHtml || null,
        request_title: requestTitle || null,
        request_content: requestContent || null,
        request_files: requestFilesArray
      });

      if (error) throw error;

      const result = data?.[0] as RFPResult;
      
      console.log('[useRFP] RFP Result:', {
        rfpId: result?.result_rfp_id,
        invitesSent: result?.result_invites_sent,
        rawData: result
      });

      // If we have additional data per advisor type, save it to the related tables
      if (result && advisorTypeDataMap) {
        await saveAdvisorTypeData(result.result_rfp_id, advisorTypePairs, advisorTypeDataMap);
      }
      
      if (result) {
        if (result.result_invites_sent === 0) {
          toast({
            title: "אזהרה",
            description: "RFP נשמר אך לא נשלחו הזמנות ליועצים. אנא בדוק שהיועצים פעילים.",
            variant: "destructive",
          });
        } else {
          // Send RFP invitation emails
          console.log('[useRFP] Triggering email sending for RFP:', result.result_rfp_id);
          
          // Determine if we're in test mode based on environment
          const isTestMode = import.meta.env.MODE === 'development' || import.meta.env.VITE_RFP_TEST_MODE === 'true';
          
          supabase.functions
            .invoke('send-rfp-email', {
              body: { 
                rfp_id: result.result_rfp_id,
                test_mode: isTestMode
              }
            })
            .then(({ data: emailData, error: emailError }) => {
              if (emailError) {
                console.error('[useRFP] Email sending failed:', emailError);
                toast({
                  title: "שליחת אימיילים נכשלה",
                  description: "ההזמנות נשלחו במערכת אך שליחת האימיילים נכשלה.",
                  variant: "destructive",
                });
              } else {
                console.log('[useRFP] Emails sent successfully:', emailData);
              }
            });

          toast({
            title: "הצעות מחיר נשלחו בהצלחה",
            description: `הזמנות נשלחו ל-${result.result_invites_sent} יועצים`,
          });
        }
      }

      return result;
    } catch (err: any) {
      // Detailed error logging
      console.error('[send_rfp] Full Error Details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        metadata: {
          projectId,
          pairsCount: advisorTypePairs.length,
        },
      });

      // User-friendly error messages
      let errorMessage = 'שגיאה בשליחת הזמנות RFP';
      
      if (err.code === 'PGRST116') {
        errorMessage = 'פונקציית שליחת ההזמנות לא נמצאה במערכת. אנא נסה שוב.';
      } else if (err.code === '42702') {
        errorMessage = 'שגיאת תצורה בפונקציית השליחה. צור קשר עם התמיכה.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save additional advisor type data (service details, fees, payment terms) to related tables
   */
  const saveAdvisorTypeData = async (
    rfpId: string,
    advisorTypePairs: Array<{advisor_id: string, advisor_type: string}>,
    advisorTypeDataMap: Record<string, AdvisorTypeData>
  ) => {
    try {
      console.log('[useRFP] Saving advisor type data for RFP:', rfpId);

      // Get the invite IDs for each advisor type
      const { data: invites, error: invitesError } = await supabase
        .from('rfp_invites')
        .select('id, advisor_id, advisor_type')
        .eq('rfp_id', rfpId);

      if (invitesError || !invites) {
        console.error('[useRFP] Error fetching invites:', invitesError);
        return;
      }

      console.log('[useRFP] Found invites:', invites.length);

      // Group invites by advisor_type
      const invitesByType: Record<string, string[]> = {};
      for (const invite of invites) {
        if (invite.advisor_type) {
          if (!invitesByType[invite.advisor_type]) {
            invitesByType[invite.advisor_type] = [];
          }
          invitesByType[invite.advisor_type].push(invite.id);
        }
      }

      // For each advisor type, save the additional data
      for (const [advisorType, inviteIds] of Object.entries(invitesByType)) {
        const typeData = advisorTypeDataMap[advisorType];
        if (!typeData) continue;

        console.log('[useRFP] Processing advisor type:', advisorType, 'invites:', inviteIds.length);

        // Update rfp_invites with service details and payment terms
        // Now saves ALL service details regardless of mode (all fields are inclusive)
        const updateData: Record<string, any> = {};
        
        if (typeData.serviceDetails) {
          // Always save all service details - no longer mode-based
          updateData.service_details_mode = typeData.serviceDetails.mode || 'checklist';
          updateData.service_details_text = typeData.serviceDetails.freeText || null;
          updateData.service_details_file = typeData.serviceDetails.file || null;
        }
        
        if (typeData.paymentTerms) {
          updateData.payment_terms = typeData.paymentTerms;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('rfp_invites')
            .update(updateData)
            .in('id', inviteIds);

          if (updateError) {
            console.error('[useRFP] Error updating invite with service/payment data:', updateError);
          }
        }

        // Save service scope items (always save if present, regardless of mode)
        if (typeData.serviceDetails?.scopeItems && typeData.serviceDetails.scopeItems.length > 0) {
          const scopeItems = typeData.serviceDetails.scopeItems.map((item, index) => ({
            rfp_invite_id: inviteIds[0], // Use first invite as reference
            task_name: item.task_name,
            is_included: item.is_included,
            is_optional: item.is_optional,
            fee_category: item.fee_category,
            display_order: item.display_order || index
          }));

          // Insert for all invites of this type
          for (const inviteId of inviteIds) {
            const itemsForInvite = scopeItems.map(item => ({ ...item, rfp_invite_id: inviteId }));
            const { error: scopeError } = await supabase
              .from('rfp_service_scope_items')
              .insert(itemsForInvite);

            if (scopeError) {
              console.error('[useRFP] Error inserting scope items:', scopeError);
            }
          }
        }

        // Save fee items
        const allFeeItems = [
          ...(typeData.feeItems || []).map(item => ({ ...item, is_optional: false })),
          ...(typeData.optionalFeeItems || []).map(item => ({ ...item, is_optional: true }))
        ];

        if (allFeeItems.length > 0) {
          for (const inviteId of inviteIds) {
            const feeItemsForInvite = allFeeItems.map((item, index) => ({
              rfp_invite_id: inviteId,
              item_number: item.item_number || index + 1,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity || 1,
              unit_price: item.unit_price || null,
              charge_type: item.charge_type,
              is_optional: item.is_optional,
              display_order: item.display_order || index,
              // Include duration for recurring payments
              duration: item.duration || null,
              duration_unit: item.duration_unit || null
            }));

            const { error: feeError } = await supabase
              .from('rfp_request_fee_items')
              .insert(feeItemsForInvite);

            if (feeError) {
              console.error('[useRFP] Error inserting fee items:', feeError);
            }
          }
        }
      }

      console.log('[useRFP] Finished saving advisor type data');
    } catch (error) {
      console.error('[useRFP] Error saving advisor type data:', error);
    }
  };

  return {
    sendRFPInvitations,
    loading
  };
};

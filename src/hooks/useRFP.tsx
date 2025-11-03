import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/utils/errorHandling';
import { DEADLINES } from '@/utils/constants';

interface RFPResult {
  rfp_id: string;
  invites_sent: number;
}

export const useRFP = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Send RFP invitations to selected advisors
   * @param projectId - UUID of the project
   * @param selectedAdvisorIds - Array of advisor UUIDs to invite
   * @param deadlineHours - Hours until deadline (default: 168 = 7 days)
   * @param emailSubject - Custom email subject (optional)
   * @param emailBodyHtml - Custom email body HTML (optional)
   * @returns RFPResult with rfp_id and invites_sent count
   */
  const sendRFPInvitations = async (
    projectId: string,
    selectedAdvisorIds: string[],
    deadlineHours: number = DEADLINES.DEFAULT_RFP_HOURS,
    emailSubject?: string,
    emailBodyHtml?: string
  ): Promise<RFPResult | null> => {
    // PHASE 3: Validate advisor selection
    if (!selectedAdvisorIds || selectedAdvisorIds.length === 0) {
      toast({
        title: "שגיאה",
        description: "לא נבחרו יועצים. אנא בחר לפחות יועץ אחד.",
        variant: "destructive",
      });
      return null;
    }

    console.log('[useRFP] Sending RFP to advisors:', {
      projectId,
      advisorIds: selectedAdvisorIds,
      count: selectedAdvisorIds.length,
      deadline: deadlineHours
    });

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('send_rfp_invitations_to_advisors', {
        project_uuid: projectId,
        selected_advisor_ids: selectedAdvisorIds,
        deadline_hours: deadlineHours,
        email_subject: emailSubject || null,
        email_body_html: emailBodyHtml || null
      });

      if (error) throw error;

      const result = data?.[0] as RFPResult;
      
      console.log('[useRFP] RFP Result:', result);
      
      if (result) {
        if (result.invites_sent === 0) {
          toast({
            title: "אזהרה",
            description: "RFP נשמר אך לא נשלחו הזמנות ליועצים. אנא בדוק שהיועצים פעילים.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "הצעות מחיר נשלחו בהצלחה",
            description: `הזמנות נשלחו ל-${result.invites_sent} יועצים`,
          });
        }
      }

      return result;
    } catch (err) {
      // Use standardized error handling
      handleError(err, {
        action: 'send_rfp',
        metadata: {
          projectId,
          advisorCount: selectedAdvisorIds.length,
        },
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendRFPInvitations,
    loading
  };
};
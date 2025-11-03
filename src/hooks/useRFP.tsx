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
      if (result) {
        toast({
          title: "הצעות מחיר נשלחו בהצלחה",
          description: `הזמנות נשלחו ל-${result.invites_sent} יועצים`,
        });
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
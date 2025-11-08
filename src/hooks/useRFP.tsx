import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/utils/errorHandling';
import { DEADLINES } from '@/utils/constants';

interface RFPResult {
  result_rfp_id: string;
  result_invites_sent: number;
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
    requestFiles?: Array<{name: string, url: string, size: number, path: string}>
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
      deadline: deadlineHours
    });

    setLoading(true);

    try {
      // Prepare request files for database (JSONB format)
      const requestFilesJson = requestFiles ? JSON.stringify(
        requestFiles.map(f => ({ name: f.name, url: f.url, size: f.size, path: f.path }))
      ) : null;

      const { data, error } = await supabase.rpc('send_rfp_invitations_to_advisors', {
        project_uuid: projectId,
        advisor_type_pairs: advisorTypePairs,
        deadline_hours: deadlineHours,
        email_subject: emailSubject || null,
        email_body_html: emailBodyHtml || null,
        request_title: requestTitle || null,
        request_content: requestContent || null,
        request_files: requestFilesJson
      });

      if (error) throw error;

      const result = data?.[0] as RFPResult;
      
      console.log('[useRFP] RFP Result:', {
        rfpId: result?.result_rfp_id,
        invitesSent: result?.result_invites_sent,
        rawData: result
      });
      
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
          
          supabase.functions
            .invoke('send-rfp-email', {
              body: { 
                rfp_id: result.result_rfp_id,
                test_mode: true // TESTING: All emails will go to lior+nihulist@spartans.tech
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

  return {
    sendRFPInvitations,
    loading
  };
};
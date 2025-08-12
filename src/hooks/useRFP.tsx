import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RFPResult {
  rfp_id: string;
  invites_sent: number;
}

export const useRFP = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendRFPInvitations = async (
    projectId: string,
    selectedSupplierIds?: string[]
  ): Promise<RFPResult | null> => {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('send_rfp_invitations', {
        project_uuid: projectId,
        selected_supplier_ids: selectedSupplierIds || null
      });

      if (error) throw error;

      const result = data?.[0] as RFPResult;
      if (result) {
        toast({
          title: "RFP Sent Successfully",
          description: `Invitations sent to ${result.invites_sent} suppliers`,
        });
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send RFP invitations';
      toast({
        title: "Error",
        description: message,
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
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDeclineRFP = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const declineRFP = async (
    rfpInviteId: string, 
    reason: 'no_capacity' | 'outside_expertise' | 'timeline_conflict' | 'budget_mismatch' | 'other', 
    note?: string
  ) => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update RFP invite status
      const { error: updateError } = await supabase
        .from('rfp_invites')
        .update({
          status: 'declined',
          decline_reason: reason,
          decline_note: note
        })
        .eq('id', rfpInviteId);

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('activity_log').insert({
        actor_id: user.id,
        actor_type: 'advisor',
        action: 'rfp_declined',
        entity_type: 'rfp_invite',
        entity_id: rfpInviteId,
        meta: {
          reason,
          note
        }
      });

      toast({
        title: 'ההזמנה נדחתה',
        description: 'היזם יקבל התראה על הדחייה',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error declining RFP:', error);
      toast({
        title: 'שגיאה בדחיית ההזמנה',
        description: error.message || 'אנא נסה שוב',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { declineRFP, loading };
};

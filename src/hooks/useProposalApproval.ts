import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

type ProposalStatus = Database['public']['Enums']['proposal_status'];

interface ApprovalData {
  proposalId: string;
  projectId: string;
  advisorId: string;
  price: number;
  timelineDays: number;
  signature?: {
    png: string;
    vector: any[];
    timestamp: string;
  };
  notes?: string;
}

export const useProposalApproval = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Approve a proposal and create project_advisor relationship
   * @param data - ApprovalData containing proposal details, pricing, timeline, and signature
   */
  const approveProposal = async (data: ApprovalData) => {
    setLoading(true);
    try {
      console.log(`[Approval] Updating proposal ${data.proposalId} status to 'accepted'`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('משתמש לא מחובר');

      // 1. Update proposal status to 'accepted'
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({ status: 'accepted' as ProposalStatus })
        .eq('id', data.proposalId);

      if (proposalError) throw proposalError;

      // 2. Create project_advisors entry
      const { error: advisorError } = await supabase
        .from('project_advisors')
        .insert({
          project_id: data.projectId,
          advisor_id: data.advisorId,
          fee_amount: data.price,
          fee_type: 'fixed',
          fee_currency: 'ILS',
          start_date: new Date().toISOString().split('T')[0],
          selected_by: user.id,
          status: 'active',
          notes: data.notes,
        });

      if (advisorError) throw advisorError;

      // 3. Create entrepreneur signature (if provided)
      if (data.signature) {
        const contentHash = `${data.proposalId}-${Date.now()}`;
        
        const { error: signatureError } = await supabase
          .from('signatures')
          .insert({
            entity_type: 'proposal_approval',
            entity_id: data.proposalId,
            signer_user_id: user.id,
            sign_png: data.signature.png,
            sign_vector_json: data.signature.vector,
            sign_text: 'Entrepreneur approval signature',
            content_hash: contentHash,
            signer_name_snapshot: user.email || 'Unknown',
            signer_email_snapshot: user.email || '',
          });

        if (signatureError) {
          console.error('Signature creation failed:', signatureError);
        }
      }

      // 4. Log activity
      await supabase.from('activity_log').insert({
        actor_id: user.id,
        actor_type: 'entrepreneur',
        action: 'proposal_approved',
        entity_type: 'proposal',
        entity_id: data.proposalId,
        project_id: data.projectId,
        meta: {
          advisor_id: data.advisorId,
          price: data.price,
          timeline_days: data.timelineDays,
        },
      });

      // 5. Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['proposals', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-advisors', data.projectId] });

      toast({
        title: 'הצעה אושרה בהצלחה',
        description: 'היועץ נוסף לפרויקט',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error approving proposal:', error);
      toast({
        title: 'שגיאה באישור הצעה',
        description: error.message || 'אירעה שגיאה בלתי צפויה',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reject a proposal with optional reason
   * @param proposalId - UUID of the proposal to reject
   * @param projectId - UUID of the project
   * @param reason - Optional rejection reason
   */
  const rejectProposal = async (proposalId: string, projectId: string, reason?: string) => {
    setLoading(true);
    console.log(`[Rejection] Updating proposal ${proposalId} status to 'rejected'`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('משתמש לא מחובר');

      // Update proposal status to 'rejected'
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'rejected' as ProposalStatus,
          terms: reason ? `סיבת דחייה: ${reason}` : null,
        })
        .eq('id', proposalId);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        actor_id: user.id,
        actor_type: 'entrepreneur',
        action: 'proposal_rejected',
        entity_type: 'proposal',
        entity_id: proposalId,
        project_id: projectId,
        meta: { reason },
      });

      queryClient.invalidateQueries({ queryKey: ['proposals', projectId] });

      toast({
        title: 'הצעה נדחתה',
        description: 'היועץ יקבל הודעה על כך',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error rejecting proposal:', error);
      toast({
        title: 'שגיאה בדחיית הצעה',
        description: error.message || 'אירעה שגיאה בלתי צפויה',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    approveProposal,
    rejectProposal,
    loading,
  };
};

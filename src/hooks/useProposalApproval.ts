import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';
import { handleError } from '@/utils/errorHandling';
import { SignatureData } from '@/components/SignatureCanvas';

type ProposalStatus = Database['public']['Enums']['proposal_status'];

interface ApprovalData {
  proposalId: string;
  projectId: string;
  advisorId: string;
  price: number;
  timelineDays: number;
  signature?: SignatureData;
  notes?: string;
}

/**
 * PHASE 2: Hook for handling proposal approval workflow
 * Uses atomic database function for transaction safety
 */
export const useProposalApproval = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Approve a proposal and create project_advisor relationship
   * Uses atomic database function to ensure all-or-nothing transaction
   * @param data - ApprovalData containing proposal details, pricing, timeline, and signature
   */
  const approveProposal = async (data: ApprovalData) => {
    setLoading(true);
    
    try {
      console.log('[Approval] Starting approval process for proposal:', data.proposalId);

      // VALIDATION: Ensure signature is provided and valid
      if (!data.signature?.png || !data.signature?.vector || data.signature.vector.length === 0) {
        throw new Error('חתימה לא תקינה - נדרש לחתום לפני אישור');
      }

      // Notes are now optional - only validate if provided
      if (data.notes && data.notes.trim().length < 10) {
        throw new Error('אם מוסיפים הערות, נדרש מינימום 10 תווים');
      }

      // Calculate content hash for signature verification
      const contentToHash = JSON.stringify({
        proposalId: data.proposalId,
        notes: data.notes,
        timestamp: data.signature.timestamp
      });
      
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(contentToHash)
      );
      const contentHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // USE ATOMIC FUNCTION for transaction safety
      console.log(`[Approval] Calling atomic approval function for proposal ${data.proposalId}`);
      
      const { data: result, error: approvalError } = await supabase.rpc(
        'approve_proposal_atomic',
        {
          p_proposal_id: data.proposalId,
          p_entrepreneur_notes: data.notes || '',
          p_signature_png: data.signature.png,
          p_signature_vector: { strokes: data.signature.vector },
          p_content_hash: contentHash,
        }
      );

      if (approvalError) throw approvalError;

      console.log('[Approval] Atomic approval successful:', result);

      toast({
        title: 'הצעה אושרה בהצלחה',
        description: 'היועץ נוסף לפרויקט',
      });

      // Send email notification to advisor
      console.log('[Approval] Sending email notification for proposal:', data.proposalId);
      try {
        const { data: emailData, error: emailError } = await supabase.functions
          .invoke('notify-proposal-approved', {
            body: {
              proposal_id: data.proposalId,
              entrepreneur_notes: data.notes,
              test_mode: false,
            },
          });

        if (emailError) {
          console.error('[Approval] Email notification failed:', emailError);
          toast({
            title: 'שים לב',
            description: 'ההצעה אושרה אך שליחת המייל ליועץ נכשלה',
            variant: 'destructive',
          });
        } else {
          console.log('[Approval] Email notification sent successfully:', emailData);
        }
      } catch (emailErr) {
        console.error('[Approval] Email notification error:', emailErr);
        toast({
          title: 'שים לב',
          description: 'ההצעה אושרה אך שליחת המייל ליועץ נכשלה',
          variant: 'destructive',
        });
      }

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['proposals', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-advisors', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', data.projectId] });

      return { success: true };
    } catch (error: any) {
      console.error('[Approval] Error:', error);
      
      // Use standardized error handling
      handleError(error, {
        action: 'approve_proposal',
        metadata: {
          proposalId: data.proposalId,
          projectId: data.projectId,
        },
      });

      return { success: false };
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

      // Send email notification to advisor (non-blocking)
      console.log('[Rejection] Sending email notification for proposal:', proposalId);
      supabase.functions
        .invoke('notify-proposal-rejected', {
          body: {
            proposal_id: proposalId,
            rejection_reason: reason,
            test_mode: false,
          },
        })
        .then(({ data: emailData, error: emailError }) => {
          if (emailError) {
            console.error('[Rejection] Email notification failed:', emailError);
          } else {
            console.log('[Rejection] Email notification sent:', emailData);
          }
        })
        .catch((err) => {
          console.error('[Rejection] Email notification error:', err);
        });

      toast({
        title: 'הצעה נדחתה',
        description: 'היועץ יקבל הודעה על כך',
      });

      return { success: true };
    } catch (error: any) {
      console.error('[Rejection] Error:', error);
      
      handleError(error, {
        action: 'reject_proposal',
        metadata: { proposalId, projectId },
      });

      return { success: false };
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

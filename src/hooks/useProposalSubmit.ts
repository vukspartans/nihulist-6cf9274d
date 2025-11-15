import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';
import { SignatureData } from '@/components/SignatureCanvas';
import { UploadedFile } from '@/components/FileUpload';
import { ProposalConditions } from '@/components/ConditionsBuilder';
import { handleError } from '@/utils/errorHandling';
import { PROPOSAL_VALIDATION, FILE_LIMITS } from '@/utils/constants';

type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];
type SignatureInsert = Database['public']['Tables']['signatures']['Insert'];
type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert'];

interface SubmitProposalData {
  rfpId: string;
  projectId: string;
  advisorId: string;
  price: number;
  timeline_days: number;
  scope_text: string;
  conditions: ProposalConditions;
  files: UploadedFile[];
  signature: SignatureData;
  declaration: string;
}

/**
 * Hook for handling proposal submissions by advisors
 * Manages validation, signature capture, and database persistence
 */
export const useProposalSubmit = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitProposal = async (data: SubmitProposalData) => {
    // Input validation using constants
    if (!data.projectId || !data.advisorId) {
      throw new Error('Missing required project or advisor ID');
    }

    if (data.price < PROPOSAL_VALIDATION.MIN_PRICE || data.price > PROPOSAL_VALIDATION.MAX_PRICE) {
      throw new Error(`מחיר לא תקין - חייב להיות בין ${PROPOSAL_VALIDATION.MIN_PRICE} ל-${PROPOSAL_VALIDATION.MAX_PRICE}`);
    }

    if (data.timeline_days < PROPOSAL_VALIDATION.MIN_TIMELINE_DAYS || data.timeline_days > PROPOSAL_VALIDATION.MAX_TIMELINE_DAYS) {
      throw new Error(`לוח זמנים לא תקין - חייב להיות בין ${PROPOSAL_VALIDATION.MIN_TIMELINE_DAYS} ל-${PROPOSAL_VALIDATION.MAX_TIMELINE_DAYS} ימים`);
    }

    if (!data.scope_text || data.scope_text.trim().length < PROPOSAL_VALIDATION.MIN_SCOPE_LENGTH) {
      throw new Error(`תיאור היקף העבודה קצר מדי - מינימום ${PROPOSAL_VALIDATION.MIN_SCOPE_LENGTH} תווים`);
    }

    if (!data.signature.png || !data.signature.vector || data.signature.vector.length === 0) {
      throw new Error('חתימה לא תקינה');
    }

    if (data.files.length > FILE_LIMITS.MAX_FILES) {
      throw new Error(`מקסימום ${FILE_LIMITS.MAX_FILES} קבצים מצורפים`);
    }

    const totalFileSize = data.files.reduce((sum, f) => sum + (f.size || 0), 0);
    if (totalFileSize > FILE_LIMITS.MAX_TOTAL_SIZE_MB * 1024 * 1024) {
      throw new Error(`גודל הקבצים המצורפים עולה על ${FILE_LIMITS.MAX_TOTAL_SIZE_MB}MB`);
    }

    setLoading(true);

    try {
      // Get user info for signature metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate content hash for signature verification
      const contentToHash = JSON.stringify({
        price: data.price,
        timeline_days: data.timeline_days,
        scope_text: data.scope_text,
        conditions: data.conditions,
        timestamp: data.signature.timestamp
      });
      
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(contentToHash)
      );
      const contentHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Get user agent and IP (IP will be captured server-side)
      const userAgent = navigator.userAgent;

      const signatureMetadata = {
        user_agent: userAgent,
        timestamp: data.signature.timestamp,
        content_hash: contentHash,
        vector_points: data.signature.vector.reduce((sum, stroke) => sum + stroke.length, 0)
      };

      // Insert proposal with proper types
      const proposalInsert: ProposalInsert = {
        project_id: data.projectId,
        advisor_id: data.advisorId,
        price: data.price,
        timeline_days: data.timeline_days,
        scope_text: data.scope_text,
        conditions_json: data.conditions as any,
        files: data.files as any,
        declaration_text: data.declaration,
        signature_blob: data.signature.png,
        signature_meta_json: signatureMetadata as any,
        supplier_name: '',
        status: 'submitted',
        currency: 'ILS'
      };

      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert(proposalInsert)
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Migrate files from temp folder to proposal folder
      console.log('[Proposal Submit] Migrating files from temp to proposal folder');
      const migratedFiles: UploadedFile[] = [];
      
      for (const file of data.files) {
        // Check if file is in temp folder
        if (file.url.startsWith(`temp-${data.advisorId}/`)) {
          const fileName = file.url.split('/').pop();
          const newFilePath = `${proposal.id}/${fileName}`;
          
          // Copy file to new location
          const { error: copyError } = await supabase.storage
            .from('proposal-files')
            .copy(file.url, newFilePath);
          
          if (copyError) {
            console.error('[Proposal Submit] Error copying file:', copyError);
            // Keep original path if copy fails
            migratedFiles.push(file);
          } else {
            // Delete old temp file
            await supabase.storage
              .from('proposal-files')
              .remove([file.url]);
            
            // Update file URL
            migratedFiles.push({
              ...file,
              url: newFilePath
            });
          }
        } else {
          // File already in correct location
          migratedFiles.push(file);
        }
      }
      
      // Update proposal with migrated file paths
      if (migratedFiles.length > 0 && migratedFiles.some(f => f.url !== data.files.find(df => df.name === f.name)?.url)) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update({ files: migratedFiles as any })
          .eq('id', proposal.id);
        
        if (updateError) {
          console.error('[Proposal Submit] Error updating file paths:', updateError);
        } else {
          console.log('[Proposal Submit] Successfully migrated', migratedFiles.length, 'files');
        }
      }

      // Create signature record
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', currentUser?.id)
        .single();

      const { error: signatureError } = await supabase
        .from('signatures')
        .insert({
          entity_type: 'proposal',
          entity_id: proposal.id,
          sign_text: data.declaration,
          sign_png: data.signature.png,
          sign_vector_json: { strokes: data.signature.vector },
          content_hash: contentHash,
          signer_user_id: user.id,
          signer_name_snapshot: profile?.name || user.email || 'Unknown',
          signer_email_snapshot: profile?.email || user.email || 'Unknown',
          user_agent: userAgent
        });

      if (signatureError) {
        console.error('Signature creation error:', signatureError);
        
        // Log the failure but don't block proposal
        await supabase.from('activity_log').insert({
          actor_id: user.id,
          actor_type: 'system',
          action: 'signature_creation_failed',
          entity_type: 'proposal',
          entity_id: proposal.id,
          meta: { error: signatureError.message }
        } as ActivityLogInsert);
        
        toast({
          title: 'הצעה נשלחה, אך החתימה לא נשמרה',
          description: 'נא ליצור קשר עם התמיכה',
          variant: 'destructive',
        });
      }

      // Log activity
      await supabase.from('activity_log').insert({
        actor_id: user.id,
        actor_type: 'advisor',
        action: 'proposal_submitted',
        entity_type: 'proposal',
        entity_id: proposal.id,
        meta: {
          project_id: data.projectId,
          rfp_id: data.rfpId,
          price: data.price,
          timeline_days: data.timeline_days
        }
      });

      toast({
        title: 'הצעת המחיר נשלחה בהצלחה',
        description: 'היזם יקבל התראה ויבחן את הצעתך',
      });

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['proposals', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['rfp-invites', data.advisorId] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', data.projectId] });

      // Send email notification to entrepreneur (non-blocking)
      console.log('[Proposal Submit] Sending email notification for proposal:', proposal.id);
      supabase.functions
        .invoke('notify-proposal-submitted', {
          body: {
            proposal_id: proposal.id,
            test_mode: true, // Set to false in production
          },
        })
        .then(({ data: emailData, error: emailError }) => {
          if (emailError) {
            console.error('[Proposal Submit] Email notification failed:', emailError);
          } else {
            console.log('[Proposal Submit] Email notification sent:', emailData);
          }
        })
        .catch((err) => {
          console.error('[Proposal Submit] Email notification error:', err);
        });

      return { success: true, proposalId: proposal.id };
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      
      // Use standardized error handling
      handleError(error, {
        action: 'submit_proposal',
        metadata: {
          projectId: data.projectId,
          rfpId: data.rfpId,
        },
      });

      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { submitProposal, loading };
};

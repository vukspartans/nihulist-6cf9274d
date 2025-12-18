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
import { sanitizeText } from '@/utils/inputSanitization';
import { validateSubmissionToken, validatePrice, validateTimeline, validateSignature, validateFileUploads, checkRateLimit } from '@/utils/securityValidation';

type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];
type SignatureInsert = Database['public']['Tables']['signatures']['Insert'];
type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert'];

interface SubmitProposalData {
  inviteId?: string; // Specific invite ID for precise status update
  rfpId: string;
  projectId: string;
  advisorId: string;
  supplierName: string;
  price: number;
  timelineDays: number;
  scopeText: string;
  conditions: ProposalConditions;
  uploadedFiles: UploadedFile[];
  signature: SignatureData;
  declarationText: string;
  submitToken?: string;
}

/**
 * Hook for handling proposal submissions by advisors
 * Phase 1 Security: Enhanced validation, sanitization, and token verification
 */
export const useProposalSubmit = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitProposal = async (data: SubmitProposalData) => {
    setLoading(true);
    console.log('[Proposal Submit] Starting submission process...');

    try {
      // SECURITY: Rate limiting check
      const rateLimitKey = `proposal-submit-${data.advisorId}`;
      const rateLimitCheck = checkRateLimit(rateLimitKey, 3, 60000);
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.error);
      }

      // SECURITY: Validate required fields
      if (!data.projectId || !data.advisorId) {
        throw new Error('Missing required project or advisor information');
      }

      // SECURITY: Validate submission token if provided
      if (data.submitToken) {
        console.log('[Proposal Submit] Validating submission token...');
        const tokenValidation = await validateSubmissionToken(data.submitToken, data.advisorId);
        if (!tokenValidation.valid) {
          throw new Error(tokenValidation.error);
        }
        console.log('[Proposal Submit] Token validation passed');
      }

      // SECURITY: Validate price, timeline, signature
      const priceValidation = validatePrice(data.price);
      if (!priceValidation.valid) throw new Error(priceValidation.error);

      const timelineValidation = validateTimeline(data.timelineDays);
      if (!timelineValidation.valid) throw new Error(timelineValidation.error);

      const signatureValidation = validateSignature(data.signature);
      if (!signatureValidation.valid) throw new Error(signatureValidation.error);

      // SECURITY: Validate text fields
      if (!data.declarationText || data.declarationText.trim().length === 0) {
        throw new Error('Declaration text is required');
      }
      if (data.declarationText.length > 5000) {
        throw new Error('Declaration text is too long');
      }
      
      if (!data.scopeText || data.scopeText.trim().length < PROPOSAL_VALIDATION.MIN_SCOPE_LENGTH) {
        throw new Error(`תיאור היקף העבודה קצר מדי - מינימום ${PROPOSAL_VALIDATION.MIN_SCOPE_LENGTH} תווים`);
      }

      // SECURITY: Validate files (convert UploadedFile to expected format)
      if (data.uploadedFiles && data.uploadedFiles.length > 0) {
        const filesWithType = data.uploadedFiles.map(f => ({ 
          name: f.name, 
          size: f.size, 
          type: f.mime || 'application/octet-stream' 
        }));
        const fileValidation = validateFileUploads(filesWithType);
        if (!fileValidation.valid) throw new Error(fileValidation.error);
      }
      // Get user info for signature metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate content hash for signature verification
      const contentToHash = JSON.stringify({
        price: data.price,
        timelineDays: data.timelineDays,
        scopeText: data.scopeText,
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
        timeline_days: data.timelineDays,
        scope_text: data.scopeText,
        conditions_json: data.conditions as any,
        files: data.uploadedFiles as any,
        declaration_text: data.declarationText,
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
      
      for (const file of data.uploadedFiles) {
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
      if (migratedFiles.length > 0 && migratedFiles.some(f => f.url !== data.uploadedFiles.find(df => df.name === f.name)?.url)) {
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
          sign_text: data.declarationText,
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
          timeline_days: data.timelineDays
        }
      });

      // Update RFP invite status to 'submitted' - use inviteId for precise update
      if (data.inviteId) {
        // Precise update using specific invite ID (prevents updating other invites)
        const { error: inviteUpdateError } = await supabase
          .from('rfp_invites')
          .update({ 
            status: 'submitted' as const,
            started_at: new Date().toISOString()
          })
          .eq('id', data.inviteId);
        
        if (inviteUpdateError) {
          console.error('[Proposal Submit] Failed to update RFP invite status:', inviteUpdateError);
        } else {
          console.log('[Proposal Submit] Updated RFP invite status to submitted (invite:', data.inviteId, ')');
        }
      } else if (data.rfpId) {
        // Fallback for legacy calls - not recommended as it may affect multiple invites
        console.warn('[Proposal Submit] Using rfpId+advisorId fallback - may affect multiple invites');
        const { error: inviteUpdateError } = await supabase
          .from('rfp_invites')
          .update({ 
            status: 'submitted' as const,
            started_at: new Date().toISOString()
          })
          .eq('rfp_id', data.rfpId)
          .eq('advisor_id', data.advisorId);
        
        if (inviteUpdateError) {
          console.error('[Proposal Submit] Failed to update RFP invite status:', inviteUpdateError);
        }
      }

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

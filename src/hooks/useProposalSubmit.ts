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
type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert'];

// Fee line item structure for structured submission
export interface FeeLineItem {
  item_id?: string;           // Original entrepreneur item ID
  description: string;
  unit: string;
  quantity: number;
  unit_price: number | null;  // Consultant's price
  comment?: string;           // Explanation
  is_entrepreneur_defined: boolean;
  is_optional?: boolean;
}

// Milestone adjustment structure
export interface MilestoneAdjustment {
  id?: string;
  description: string;
  entrepreneur_percentage: number | null;
  consultant_percentage: number;
  trigger?: string;
  is_entrepreneur_defined: boolean;
}

export interface SubmitProposalData {
  inviteId?: string;
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
  
  // Phase 3.6: Structured fee data
  feeLineItems?: FeeLineItem[];
  
  // Phase 3.6: Selected services
  selectedServices?: string[];
  servicesNotes?: string;
  
  // Phase 4: Deselected services comment (sent to investor)
  deselectedServicesComment?: string;
  
  // Phase 3.6: Milestone adjustments
  milestoneAdjustments?: MilestoneAdjustment[];
  
  // Phase 3.6: Consultant request response
  consultantRequestNotes?: string;
  consultantRequestFiles?: UploadedFile[];
  
  // Phase 4: Payment terms change tracking
  paymentTermType?: 'current' | 'net_30' | 'net_60' | 'net_90';
  paymentTermsComment?: string;
  entrepreneurPaymentTermType?: 'current' | 'net_30' | 'net_60' | 'net_90';
}

/**
 * Hook for handling proposal submissions by advisors
 * Phase 3.6: Enhanced with structured data support
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

      // Validate fee line items total matches price (if provided)
      if (data.feeLineItems && data.feeLineItems.length > 0) {
        const feeTotal = data.feeLineItems.reduce((sum, item) => {
          const itemPrice = item.unit_price ?? 0;
          const qty = item.quantity || 1;
          return sum + (itemPrice * qty);
        }, 0);
        
        // Allow 1% tolerance for rounding
        const tolerance = data.price * 0.01;
        if (Math.abs(feeTotal - data.price) > tolerance) {
          console.warn('[Proposal Submit] Fee total mismatch:', { feeTotal, price: data.price });
          // Don't throw, just log - price field takes precedence
        }
      }

      // Validate milestones sum to 100% (if provided)
      if (data.milestoneAdjustments && data.milestoneAdjustments.length > 0) {
        const totalPercentage = data.milestoneAdjustments.reduce(
          (sum, m) => sum + (m.consultant_percentage || 0), 
          0
        );
        if (Math.abs(totalPercentage - 100) > 1) {
          throw new Error(`סכום אחוזי התשלום חייב להיות 100% (נוכחי: ${totalPercentage}%)`);
        }
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
        feeLineItems: data.feeLineItems,
        selectedServices: data.selectedServices,
        milestoneAdjustments: data.milestoneAdjustments,
        timestamp: data.signature.timestamp
      });
      
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(contentToHash)
      );
      const contentHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Get user agent
      const userAgent = navigator.userAgent;

      const signatureMetadata = {
        user_agent: userAgent,
        timestamp: data.signature.timestamp,
        content_hash: contentHash,
        vector_points: data.signature.vector.reduce((sum, stroke) => sum + stroke.length, 0)
      };

      // Insert proposal with structured data
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
        currency: 'ILS',
        // Phase 3.6: New structured fields
        fee_line_items: (data.feeLineItems || []) as any,
        selected_services: (data.selectedServices || []) as any,
        milestone_adjustments: (data.milestoneAdjustments || []) as any,
        consultant_request_notes: data.consultantRequestNotes || null,
        consultant_request_files: (data.consultantRequestFiles || []) as any,
        services_notes: data.deselectedServicesComment 
          ? `${data.servicesNotes || ''}\n\n${data.deselectedServicesComment}`.trim()
          : (data.servicesNotes || null),
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
        if (file.url.startsWith(`temp-${data.advisorId}/`)) {
          const fileName = file.url.split('/').pop();
          const newFilePath = `${proposal.id}/${fileName}`;
          
          const { error: copyError } = await supabase.storage
            .from('proposal-files')
            .copy(file.url, newFilePath);
          
          if (copyError) {
            console.error('[Proposal Submit] Error copying file:', copyError);
            migratedFiles.push(file);
          } else {
            await supabase.storage
              .from('proposal-files')
              .remove([file.url]);
            
            migratedFiles.push({
              ...file,
              url: newFilePath
            });
          }
        } else {
          migratedFiles.push(file);
        }
      }

      // Also migrate consultant request files if any
      const migratedRequestFiles: UploadedFile[] = [];
      if (data.consultantRequestFiles && data.consultantRequestFiles.length > 0) {
        for (const file of data.consultantRequestFiles) {
          if (file.url.startsWith(`temp-${data.advisorId}/`)) {
            const fileName = file.url.split('/').pop();
            const newFilePath = `${proposal.id}/request-response/${fileName}`;
            
            const { error: copyError } = await supabase.storage
              .from('proposal-files')
              .copy(file.url, newFilePath);
            
            if (copyError) {
              console.error('[Proposal Submit] Error copying request file:', copyError);
              migratedRequestFiles.push(file);
            } else {
              await supabase.storage
                .from('proposal-files')
                .remove([file.url]);
              
              migratedRequestFiles.push({
                ...file,
                url: newFilePath
              });
            }
          } else {
            migratedRequestFiles.push(file);
          }
        }
      }
      
      // Update proposal with migrated file paths
      const needsUpdate = 
        migratedFiles.some(f => f.url !== data.uploadedFiles.find(df => df.name === f.name)?.url) ||
        migratedRequestFiles.some(f => f.url !== data.consultantRequestFiles?.find(df => df.name === f.name)?.url);
      
      if (needsUpdate) {
        const updateData: any = {};
        if (migratedFiles.length > 0) {
          updateData.files = migratedFiles;
        }
        if (migratedRequestFiles.length > 0) {
          updateData.consultant_request_files = migratedRequestFiles;
        }
        
        const { error: updateError } = await supabase
          .from('proposals')
          .update(updateData)
          .eq('id', proposal.id);
        
        if (updateError) {
          console.error('[Proposal Submit] Error updating file paths:', updateError);
        } else {
          console.log('[Proposal Submit] Successfully migrated files');
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

      // Log activity with structured data summary
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
          timeline_days: data.timelineDays,
          has_fee_breakdown: (data.feeLineItems?.length || 0) > 0,
          has_services_selection: (data.selectedServices?.length || 0) > 0,
          has_milestone_adjustments: (data.milestoneAdjustments?.length || 0) > 0,
          has_request_response: !!(data.consultantRequestNotes || data.consultantRequestFiles?.length)
        }
      });

      // Update RFP invite status
      if (data.inviteId) {
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
          console.log('[Proposal Submit] Updated RFP invite status to submitted');
        }
      } else if (data.rfpId) {
        console.warn('[Proposal Submit] Using rfpId+advisorId fallback');
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

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['proposals', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['rfp-invites', data.advisorId] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', data.projectId] });

      // Send email notification (non-blocking)
      console.log('[Proposal Submit] Sending email notification for proposal:', proposal.id);
      supabase.functions
        .invoke('notify-proposal-submitted', {
          body: {
            proposal_id: proposal.id,
            test_mode: true,
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

      // Phase 4: Payment terms change notification (non-blocking)
      if (data.paymentTermType && 
          data.entrepreneurPaymentTermType && 
          data.paymentTermType !== data.entrepreneurPaymentTermType) {
        console.log('[Proposal Submit] Payment terms changed, sending notification');
        
        // Fetch entrepreneur email
        const { data: projectData } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', data.projectId)
          .single();
        
        if (projectData?.owner_id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('email, name')
            .eq('user_id', projectData.owner_id)
            .single();
          
          if (ownerProfile?.email) {
            const paymentTermLabels: Record<string, string> = {
              'current': 'שוטף',
              'net_30': 'שוטף + 30',
              'net_60': 'שוטף + 60',
              'net_90': 'שוטף + 90',
            };
            
            const originalTerm = paymentTermLabels[data.entrepreneurPaymentTermType] || data.entrepreneurPaymentTermType;
            const newTerm = paymentTermLabels[data.paymentTermType] || data.paymentTermType;
            
            const notificationBody = `
              <div dir="rtl" style="font-family: sans-serif;">
                <h2>יועץ שינה תנאי תשלום בהצעה</h2>
                <p>שלום ${ownerProfile.name || 'יזם יקר'},</p>
                <p>היועץ <strong>${profile?.name || 'יועץ'}</strong> שינה את תנאי התשלום בהצעתו:</p>
                <ul>
                  <li>תנאי מקוריים: <strong>${originalTerm}</strong></li>
                  <li>תנאים חדשים: <strong>${newTerm}</strong></li>
                </ul>
                ${data.paymentTermsComment ? `<p><strong>הסבר היועץ:</strong> ${data.paymentTermsComment}</p>` : ''}
                <p>ניתן לצפות בהצעה המלאה במערכת.</p>
              </div>
            `;
            
            // Insert notification to queue
            const { error: notifyError } = await supabase.rpc('enqueue_notification', {
              p_notification_type: 'payment_terms_changed',
              p_recipient_email: ownerProfile.email,
              p_recipient_id: projectData.owner_id,
              p_subject: 'יועץ שינה תנאי תשלום בהצעה',
              p_body_html: notificationBody,
              p_template_data: {
                original_term: data.entrepreneurPaymentTermType,
                new_term: data.paymentTermType,
                comment: data.paymentTermsComment,
                advisor_name: profile?.name,
                proposal_id: proposal.id,
              },
              p_entity_type: 'proposal',
              p_entity_id: proposal.id,
              p_priority: 3, // High priority
            });
            
            if (notifyError) {
              console.error('[Proposal Submit] Payment terms notification failed:', notifyError);
            } else {
              console.log('[Proposal Submit] Payment terms notification queued');
            }
          }
        }
      }

      return { success: true, proposalId: proposal.id };
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      
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

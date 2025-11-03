import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SignatureData } from '@/components/SignatureCanvas';
import { UploadedFile } from '@/components/FileUpload';
import { ProposalConditions } from '@/components/ConditionsBuilder';

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

export const useProposalSubmit = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submitProposal = async (data: SubmitProposalData) => {
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
      const proposalInsert: any = {
        advisor_id: data.advisorId,
        price: data.price,
        timeline_days: data.timeline_days,
        scope_text: data.scope_text,
        conditions_json: data.conditions,
        files: data.files,
        declaration_text: data.declaration,
        signature_blob: data.signature.png,
        signature_meta_json: signatureMetadata,
        supplier_name: '',
        submitted_at: new Date().toISOString()
      };

      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert(proposalInsert)
        .select()
        .single();

      if (proposalError) throw proposalError;

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
        // Don't fail the whole submission if signature record fails
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

      return { success: true, proposalId: proposal.id };
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      toast({
        title: 'שגיאה בשליחת הצעת המחיר',
        description: error.message || 'אנא נסה שוב',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { submitProposal, loading };
};

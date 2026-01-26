import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EvaluationResult {
  batch_summary:
    | {
        total_proposals: number;
        project_type_detected: 'STANDARD' | 'LARGE_SCALE';
        price_benchmark_used: null;
        evaluation_mode: 'SINGLE';
        market_context?: string;
      }
    | {
        total_proposals: number;
        project_type_detected: 'STANDARD' | 'LARGE_SCALE';
        price_benchmark_used: number | null;
        evaluation_mode: 'COMPARE';
        market_context?: string;
      };
  ranked_proposals:
    | Array<{
        proposal_id: string;
        vendor_name: string;
        final_score: number;
        rank: number;
        data_completeness: number;
        recommendation_level: 'Highly Recommended' | 'Recommended' | 'Review Required' | 'Not Recommended';
        individual_analysis: {
          requirements_alignment: string;
          timeline_assessment: string;
          experience_assessment: string;
          scope_quality: string;
          fee_structure_assessment?: string;
          payment_terms_assessment?: string;
          strengths: string[];
          weaknesses: string[];
          missing_requirements: string[];
          extra_offerings: string[];
        };
        flags: {
          red_flags: string[];
          green_flags: string[];
          knockout_triggered: boolean;
          knockout_reason: string | null;
        };
        comparative_notes: null;
      }>
    | Array<{
        proposal_id: string;
        vendor_name: string;
        final_score: number;
        rank: number;
        data_completeness: number;
        recommendation_level: 'Highly Recommended' | 'Recommended' | 'Review Required' | 'Not Recommended';
        individual_analysis: {
          requirements_alignment: string;
          price_assessment: string;
          timeline_assessment: string;
          experience_assessment: string;
          scope_quality: string;
          fee_structure_assessment?: string;
          payment_terms_assessment?: string;
          strengths: string[];
          weaknesses: string[];
          missing_requirements: string[];
          extra_offerings: string[];
        };
        flags: {
          red_flags: string[];
          green_flags: string[];
          knockout_triggered: boolean;
          knockout_reason: string | null;
        };
        comparative_notes: string | null;
      }>;
  evaluation_metadata?: {
    model_used: string;
    provider: string;
    temperature: number;
    total_evaluation_time_ms: number;
  };
}

export const useProposalEvaluation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const evaluateProposals = async (
    projectId: string,
    proposalIds?: string[]
  ): Promise<EvaluationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Evaluation] Starting evaluation for project:', projectId);
      
      const { data, error: invokeError } = await supabase.functions.invoke(
        'evaluate-proposals-batch',
        {
          body: {
            project_id: projectId,
            proposal_ids: proposalIds,
          },
        }
      );

      console.log('[Evaluation] Response received:', { data, error: invokeError });

      if (invokeError) {
        console.error('[Evaluation] Invoke error:', invokeError);
        throw new Error(invokeError.message || 'Failed to invoke evaluation function');
      }

      if (!data) {
        throw new Error('No data returned from evaluation');
      }

      if (data.success === false) {
        throw new Error(data.error || 'Evaluation failed');
      }

      // Handle both successful response formats
      const result: EvaluationResult = {
        batch_summary: data.batch_summary,
        ranked_proposals: data.ranked_proposals || [],
        evaluation_metadata: data.evaluation_metadata,
      };

      toast({
        title: 'ההערכה הושלמה בהצלחה',
        description: `נמצאו ${result.ranked_proposals.length} הצעות מדורגות`,
      });

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'שגיאה בהערכת ההצעות';
      setError(errorMessage);

      // User-friendly error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('API key')) {
        userMessage = 'שירות AI לא מוגדר. אנא פנה לתמיכה.';
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'ההערכה ארכה זמן רב מדי. נסה שוב מאוחר יותר.';
      } else if (errorMessage.includes('JSON')) {
        userMessage = 'שגיאה בעיבוד תגובת AI. נסה שוב.';
      }

      toast({
        title: 'שגיאה בהערכה',
        description: userMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    evaluateProposals,
    loading,
    error,
  };
};



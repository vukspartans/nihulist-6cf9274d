import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EvaluationResult {
  batch_summary: {
    total_proposals: number;
    project_type_detected: 'STANDARD' | 'LARGE_SCALE';
    price_benchmark_used: number | null; // null for single proposal
    evaluation_mode: 'SINGLE' | 'BATCH';
    market_context?: string; // Brief note about Israeli market context
  };
  ranked_proposals: Array<{
    proposal_id: string;
    vendor_name: string;
    final_score: number;
    rank: number;
    data_completeness: number; // 0.0-1.0, confidence in score based on available data
    recommendation_level: 'Highly Recommended' | 'Recommended' | 'Review Required' | 'Not Recommended';
    individual_analysis: {
      requirements_alignment: string; // Detailed assessment
      price_assessment: string;
      timeline_assessment: string;
      experience_assessment: string;
      scope_quality: string;
      strengths: string[];
      weaknesses: string[];
      missing_requirements: string[]; // What was requested but not included
      extra_offerings: string[]; // What was offered beyond requirements
    };
    flags: {
      red_flags: string[];
      green_flags: string[];
      knockout_triggered: boolean;
      knockout_reason: string | null;
    };
    comparative_notes: string | null; // Only if batch mode, how this compares to others
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
      const { data, error: invokeError } = await supabase.functions.invoke(
        'evaluate-proposals-batch',
        {
          body: {
            project_id: projectId,
            proposal_ids: proposalIds,
          },
        }
      );

      if (invokeError) {
        throw invokeError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Evaluation failed');
      }

      toast({
        title: 'ההערכה הושלמה בהצלחה',
        description: `נמצאו ${data.ranked_proposals.length} הצעות מדורגות`,
      });

      return data as EvaluationResult;
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



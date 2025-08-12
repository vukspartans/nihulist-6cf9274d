import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Recommendation {
  supplier_id: string;
  supplier_name: string;
  match_score: number;
  confidence: number;
  reason: string;
}

export const useRecommendations = (projectId: string | null) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRecommendations = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('generate_project_recommendations', {
        project_uuid: projectId
      });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      generateRecommendations();
    }
  }, [projectId]);

  return {
    recommendations,
    loading,
    error,
    regenerate: generateRecommendations
  };
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useOpenTaskCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalOpen, setTotalOpen] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .neq('status', 'deleted');

      if (!projects || projects.length === 0) {
        setCounts({});
        setTotalOpen(0);
        setLoading(false);
        return;
      }

      const projectIds = projects.map(p => p.id);

      const { data: tasks, error } = await supabase
        .from('project_tasks')
        .select('project_id')
        .in('project_id', projectIds)
        .not('status', 'in', '("completed","cancelled")');

      if (error) throw error;

      const grouped: Record<string, number> = {};
      (tasks || []).forEach(t => {
        grouped[t.project_id] = (grouped[t.project_id] || 0) + 1;
      });

      setCounts(grouped);
      setTotalOpen((tasks || []).length);
    } catch (err) {
      console.error('Error fetching open task counts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, totalOpen, loading, refetch: fetchCounts };
}

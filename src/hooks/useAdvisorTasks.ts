import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TaskStatus } from '@/types/task';

export interface AdvisorTaskWithDetails {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  phase: string | null;
  status: TaskStatus;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  assigned_advisor_id: string | null;
  progress_percent: number | null;
  is_milestone: boolean | null;
  is_payment_critical: boolean | null;
  payment_milestone_id: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  project_name: string;
  project_phase: string | null;
  project_type: string | null;
  advisor_name: string | null;
  entrepreneur_name: string | null;
}

export interface AdvisorProjectOption {
  id: string;
  name: string;
  phase: string | null;
  type: string | null;
}

export interface AdvisorTaskFiltersState {
  projectId: string | null;
  statuses: TaskStatus[];
}

export function useAdvisorTasks(advisorId: string | null) {
  const [tasks, setTasks] = useState<AdvisorTaskWithDetails[]>([]);
  const [projects, setProjects] = useState<AdvisorProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdvisorTaskFiltersState>({
    projectId: null,
    statuses: [],
  });

  const fetchData = useCallback(async () => {
    if (!advisorId) return;

    try {
      setLoading(true);

      // Fetch tasks assigned to this advisor
      const { data: tasksData, error: taskErr } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('assigned_advisor_id', advisorId)
        .order('planned_end_date', { ascending: true, nullsFirst: false });

      if (taskErr) throw taskErr;

      // Also fetch tasks where advisor is an observer (CC'd)
      const { data: observedData } = await supabase
        .from('task_observers')
        .select('task_id')
        .eq('advisor_id', advisorId);

      const observedTaskIds = (observedData || []).map(o => o.task_id);
      let observedTasks: any[] = [];
      if (observedTaskIds.length > 0) {
        const { data } = await supabase
          .from('project_tasks')
          .select('*')
          .in('id', observedTaskIds);
        observedTasks = data || [];
      }

      // Merge, dedup
      const allTasksMap = new Map<string, any>();
      (tasksData || []).forEach(t => allTasksMap.set(t.id, { ...t, is_observed: false }));
      observedTasks.forEach(t => {
        if (!allTasksMap.has(t.id)) allTasksMap.set(t.id, { ...t, is_observed: true });
      });
      const mergedTasks = Array.from(allTasksMap.values());

      if (mergedTasks.length === 0) {
        setTasks([]);
        setProjects([]);
        setLoading(false);
        return;
      }

      // Get unique project IDs
      const projectIds = [...new Set(mergedTasks.map(t => t.project_id))];

      // Fetch projects
      const { data: projectsData, error: projErr } = await supabase
        .from('projects')
        .select('id, name, phase, type, owner_id')
        .in('id', projectIds);

      if (projErr) throw projErr;

      // Fetch entrepreneur names
      const ownerIds = [...new Set((projectsData || []).map(p => p.owner_id))];
      let entrepreneurNames: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, organization_id')
          .in('user_id', ownerIds);

        if (profiles) {
          const orgIds = profiles.filter(p => p.organization_id).map(p => p.organization_id) as string[];
          let companyNames: Record<string, string> = {};
          if (orgIds.length > 0) {
            const { data: companies } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', orgIds);
            if (companies) {
              companyNames = Object.fromEntries(companies.map(c => [c.id, c.name]));
            }
          }
          entrepreneurNames = Object.fromEntries(
            profiles.map(p => [
              p.user_id,
              (p.organization_id && companyNames[p.organization_id]) || p.name || 'יזם'
            ])
          );
        }
      }

      // Fetch advisor's own company name
      const { data: advisorData } = await supabase
        .from('advisors')
        .select('company_name')
        .eq('id', advisorId)
        .single();

      const advisorName = advisorData?.company_name || null;

      const projectMap = new Map((projectsData || []).map(p => [p.id, p]));

      setProjects(
        (projectsData || []).map(p => ({
          id: p.id,
          name: p.name,
          phase: p.phase,
          type: p.type,
        }))
      );

      const mapped: AdvisorTaskWithDetails[] = mergedTasks.map((t: any) => {
        const proj = projectMap.get(t.project_id);
        return {
          id: t.id,
          project_id: t.project_id,
          name: t.name,
          description: t.description,
          phase: t.phase,
          status: t.status as TaskStatus,
          planned_start_date: t.planned_start_date,
          planned_end_date: t.planned_end_date,
          actual_start_date: t.actual_start_date,
          actual_end_date: t.actual_end_date,
          assigned_advisor_id: t.assigned_advisor_id,
          progress_percent: t.progress_percent,
          is_milestone: t.is_milestone,
          is_payment_critical: t.is_payment_critical,
          payment_milestone_id: t.payment_milestone_id,
          display_order: t.display_order,
          created_at: t.created_at,
          updated_at: t.updated_at,
          project_name: proj?.name || '',
          project_phase: proj?.phase || null,
          project_type: proj?.type || null,
          advisor_name: advisorName,
          entrepreneur_name: proj ? (entrepreneurNames[proj.owner_id] || null) : null,
          is_observed: t.is_observed || false,
        };
      });

      setTasks(mapped);
    } catch (error) {
      console.error('Error fetching advisor tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [advisorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.projectId && t.project_id !== filters.projectId) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false;
      return true;
    });
  }, [tasks, filters]);

  const openTasksCount = useMemo(() => {
    return tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  }, [tasks]);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    projects,
    loading,
    filters,
    setFilters,
    openTasksCount,
    refetch: fetchData,
  };
}

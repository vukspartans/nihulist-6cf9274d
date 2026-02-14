import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { TaskStatus } from '@/types/task';

export interface ProjectTaskWithDetails {
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
  priority: number | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  project_name: string;
  project_phase: string | null;
  project_type: string | null;
  advisor_name: string | null;
}

export interface ProjectOption {
  id: string;
  name: string;
  phase: string | null;
  type: string | null;
}

export interface TaskFiltersState {
  projectId: string | null;
  domain: string | null; // advisor expertise/domain
  advisorId: string | null;
  statuses: TaskStatus[];
}

export function useAllProjectsTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProjectTaskWithDetails[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFiltersState>({
    projectId: null,
    domain: null,
    advisorId: null,
    statuses: [],
  });

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch projects
      const { data: projectsData, error: projErr } = await supabase
        .from('projects')
        .select('id, name, phase, type')
        .eq('owner_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;
      setProjects(projectsData || []);

      const projectIds = (projectsData || []).map(p => p.id);
      if (projectIds.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Fetch tasks with advisor join
      const { data: tasksData, error: taskErr } = await supabase
        .from('project_tasks')
        .select(`
          *,
          advisors:assigned_advisor_id (
            id,
            company_name
          )
        `)
        .in('project_id', projectIds)
        .order('planned_end_date', { ascending: true, nullsFirst: false });

      if (taskErr) throw taskErr;

      // Map projects for quick lookup
      const projectMap = new Map((projectsData || []).map(p => [p.id, p]));

      const mapped: ProjectTaskWithDetails[] = (tasksData || []).map((t: any) => ({
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
        priority: t.priority || 0,
        display_order: t.display_order,
        created_at: t.created_at,
        updated_at: t.updated_at,
        project_name: projectMap.get(t.project_id)?.name || '',
        project_phase: projectMap.get(t.project_id)?.phase || null,
        project_type: projectMap.get(t.project_id)?.type || null,
        advisor_name: t.advisors?.company_name || null,
      }));

      setTasks(mapped);
    } catch (error) {
      console.error('Error fetching all projects tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.projectId && t.project_id !== filters.projectId) return false;
      if (filters.advisorId && t.assigned_advisor_id !== filters.advisorId) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false;
      // Domain filtering would require advisor expertise data - skip for now
      return true;
    });
  }, [tasks, filters]);

  const openTasksCount = useMemo(() => {
    return tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  }, [tasks]);

  const advisorOptions = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => {
      if (t.assigned_advisor_id && t.advisor_name) {
        map.set(t.assigned_advisor_id, t.advisor_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    projects,
    loading,
    filters,
    setFilters,
    openTasksCount,
    advisorOptions,
    refetch: fetchData,
  };
}

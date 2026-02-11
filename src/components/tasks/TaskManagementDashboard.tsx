import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LicensingTimeline } from './LicensingTimeline';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { ProjectTaskView } from './ProjectTaskView';
import { TaskFilters } from './TaskFilters';
import { TaskDetailDialog } from './TaskDetailDialog';
import { AutoTaskSuggestionBanner } from './AutoTaskSuggestionBanner';
import { useAllProjectsTasks } from '@/hooks/useAllProjectsTasks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectTask, ProjectAdvisorOption } from '@/types/task';

export function TaskManagementDashboard() {
  const {
    tasks,
    allTasks,
    projects,
    loading,
    filters,
    setFilters,
    openTasksCount,
    advisorOptions,
    refetch,
  } = useAllProjectsTasks();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectAdvisors, setProjectAdvisors] = useState<ProjectAdvisorOption[]>([]);

  const mode = selectedProjectId ? 'single' : 'all';

  // Find the full task object for the dialog
  const selectedTask: ProjectTask | null = selectedTaskId
    ? (allTasks.find(t => t.id === selectedTaskId) as unknown as ProjectTask) || null
    : null;

  // Load project advisors when a task is selected
  useEffect(() => {
    if (!selectedTask) return;
    const loadAdvisors = async () => {
      const { data } = await supabase
        .from('project_advisors')
        .select('id, advisor_id, advisors(company_name)')
        .eq('project_id', selectedTask.project_id);
      setProjectAdvisors(
        (data || []).map((pa: any) => ({
          id: pa.id,
          advisor_id: pa.advisor_id,
          company_name: pa.advisors?.company_name || null,
        }))
      );
    };
    loadAdvisors();
  }, [selectedTask?.project_id]);

  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setDialogOpen(true);
  }, []);

  const handleTaskSubmit = useCallback(async (taskId: string, updates: Partial<ProjectTask>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update(updates)
        .eq('id', taskId);
      if (error) throw error;
      toast.success('המשימה עודכנה בהצלחה');
      refetch();
      return true;
    } catch (err) {
      console.error('Error updating task:', err);
      toast.error('שגיאה בעדכון המשימה');
      return false;
    }
  }, [refetch]);

  const handleProjectSelect = (value: string) => {
    const pid = value === 'all' ? null : value;
    setSelectedProjectId(pid);
    setFilters(f => ({ ...f, projectId: pid }));
  };

  // Check if current project has tasks (for auto-load banner)
  const currentProjectHasTasks = selectedProjectId
    ? allTasks.some(t => t.project_id === selectedProjectId)
    : true;

  const currentProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // All project task ids for dependency selector
  const allProjectTasksForDialog = selectedTask
    ? allTasks
        .filter(t => t.project_id === selectedTask.project_id && t.id !== selectedTask.id)
        .map(t => ({ id: t.id, name: t.name, status: t.status }))
    : [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Project selector + open tasks count */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedProjectId || 'all'}
          onValueChange={handleProjectSelect}
          dir="rtl"
        >
          <SelectTrigger className="w-[240px] text-right">
            <SelectValue placeholder="כלל הפרויקטים" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כלל הפרויקטים</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="text-sm">
          {openTasksCount} משימות פתוחות
        </Badge>
      </div>

      {/* Timeline */}
      <LicensingTimeline
        mode={mode}
        projects={projects}
        selectedProjectId={selectedProjectId}
      />

      {/* Auto-load suggestion banner */}
      {selectedProjectId && !currentProjectHasTasks && currentProject && (
        <AutoTaskSuggestionBanner
          projectId={selectedProjectId}
          projectType={currentProject.type}
          projectPhase={currentProject.phase}
          onTasksCreated={refetch}
        />
      )}

      {/* Filters */}
      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        advisorOptions={advisorOptions}
      />

      {/* Content */}
      {mode === 'all' ? (
        <AllProjectsTaskTable
          tasks={tasks}
          onProjectClick={(pid) => {
            setSelectedProjectId(pid);
            setFilters(f => ({ ...f, projectId: pid }));
          }}
          onTaskClick={handleTaskClick}
        />
      ) : (
        <ProjectTaskView
          tasks={tasks}
          projectId={selectedProjectId!}
          onTaskClick={handleTaskClick}
        />
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleTaskSubmit}
        projectAdvisors={projectAdvisors}
        allProjectTasks={allProjectTasksForDialog}
      />
    </div>
  );
}

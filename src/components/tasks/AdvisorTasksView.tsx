import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { LicensingTimeline } from './LicensingTimeline';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { TaskDetailDialog } from './TaskDetailDialog';
import { useAdvisorTasks } from '@/hooks/useAdvisorTasks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectTask, ProjectAdvisorOption, TaskStatus } from '@/types/task';
import type { ProjectOption } from '@/hooks/useAllProjectsTasks';

interface AdvisorTasksViewProps {
  advisorId: string;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בביצוע' },
  { value: 'blocked', label: 'חסום' },
  { value: 'delayed', label: 'באיחור' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

export function AdvisorTasksView({ advisorId }: AdvisorTasksViewProps) {
  const { tasks, projects, loading, filters, setFilters, openTasksCount } = useAdvisorTasks(advisorId);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectAdvisors, setProjectAdvisors] = useState<ProjectAdvisorOption[]>([]);

  const selectedTask: ProjectTask | null = selectedTaskId
    ? (tasks.find((t: any) => t.id === selectedTaskId) as unknown as ProjectTask) || null
    : null;

  // Fetch project advisors when a task is selected
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
      return true;
    } catch (err) {
      console.error('Error updating task:', err);
      toast.error('שגיאה בעדכון המשימה');
      return false;
    }
  }, []);

  const toggleStatus = (status: TaskStatus) => {
    const current = filters.statuses;
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    setFilters({ ...filters, statuses: next });
  };

  const hasActiveFilters = filters.projectId || filters.statuses.length > 0;

  // Map projects for LicensingTimeline compatibility
  const timelineProjects: ProjectOption[] = projects.map(p => ({
    id: p.id,
    name: p.name,
    phase: p.phase,
    type: p.type,
  }));

  const allProjectTasksForDialog = selectedTask
    ? tasks
        .filter((t: any) => t.project_id === selectedTask.project_id && t.id !== selectedTask.id)
        .map((t: any) => ({ id: t.id, name: t.name, status: t.status }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Licensing Timeline */}
      <LicensingTimeline
        mode={filters.projectId ? 'single' : 'all'}
        projects={timelineProjects}
        selectedProjectId={filters.projectId}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Project filter */}
        <Select
          value={filters.projectId || 'all'}
          onValueChange={(v) => setFilters({ ...filters, projectId: v === 'all' ? null : v })}
          dir="rtl"
        >
          <SelectTrigger className="w-[220px] text-right">
            <SelectValue placeholder="בחר פרויקט" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל הפרויקטים ({openTasksCount} משימות פתוחות)</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map(opt => (
            <Badge
              key={opt.value}
              variant={filters.statuses.includes(opt.value) ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => toggleStatus(opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ projectId: null, statuses: [] })}
            className="h-7 px-2 text-xs"
          >
            <X className="w-3 h-3 ml-1" />
            נקה
          </Button>
        )}
      </div>

      {/* Tasks Table */}
      <AllProjectsTaskTable
        tasks={tasks as any}
        onTaskClick={handleTaskClick}
        onProjectClick={undefined}
      />

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

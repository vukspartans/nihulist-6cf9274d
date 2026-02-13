import { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { LicensingTimeline } from './LicensingTimeline';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { ProjectTaskView } from './ProjectTaskView';
import { TaskDetailDialog } from './TaskDetailDialog';
import { AutoTaskSuggestionBanner } from './AutoTaskSuggestionBanner';
import { useAllProjectsTasks } from '@/hooks/useAllProjectsTasks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, PlayCircle, AlertTriangle, CheckCircle, Ban, XCircle, X } from 'lucide-react';
import type { ProjectTask, ProjectAdvisorOption, TaskStatus } from '@/types/task';
import { PendingChangesNotification } from './PendingChangesNotification';
import { useOpenTaskCounts } from '@/hooks/useOpenTaskCounts';
import { useRescheduleProposals, type RescheduleProposal, type ProposedChange } from '@/hooks/useRescheduleProposals';
import { RescheduleBanner } from './RescheduleBanner';
import { RescheduleReviewDialog } from './RescheduleReviewDialog';
import { cn } from '@/lib/utils';

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

  const { counts: openTaskCounts } = useOpenTaskCounts();
  const projectIdsForProposals = useMemo(() => projects.map(p => p.id), [projects]);
  const { proposals, acceptProposal, dismissProposal } = useRescheduleProposals(projectIdsForProposals);
  const [reviewProposal, setReviewProposal] = useState<RescheduleProposal | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const mode = selectedProjectId ? 'single' : 'all';

  const toggleStatus = useCallback((status: TaskStatus) => {
    setFilters(f => ({
      ...f,
      statuses: f.statuses.includes(status)
        ? f.statuses.filter(s => s !== status)
        : [...f.statuses, status],
    }));
  }, [setFilters]);

  const hasActiveFilters = filters.advisorId || filters.statuses.length > 0;

  const selectedTask: ProjectTask | null = selectedTaskId
    ? (allTasks.find(t => t.id === selectedTaskId) as unknown as ProjectTask) || null
    : null;

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

      // Sync planned_end_date to linked payment milestone
      if (updates.planned_end_date) {
        const task = allTasks.find(t => t.id === taskId);
        if ((task as any)?.payment_milestone_id) {
          await supabase
            .from('payment_milestones')
            .update({ due_date: updates.planned_end_date })
            .eq('id', (task as any).payment_milestone_id);
        }
      }

      toast.success('המשימה עודכנה בהצלחה');
      refetch();
      return true;
    } catch (err) {
      console.error('Error updating task:', err);
      toast.error('שגיאה בעדכון המשימה');
      return false;
    }
  }, [refetch]);

  const handleTaskDelete = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
      toast.success('המשימה נמחקה בהצלחה');
      refetch();
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      toast.error('שגיאה במחיקת המשימה');
      return false;
    }
  }, [refetch]);

  const handleProjectSelect = (value: string) => {
    const pid = value === 'all' ? null : value;
    setSelectedProjectId(pid);
    setFilters(f => ({ ...f, projectId: pid }));
  };

  const currentProjectHasTasks = selectedProjectId
    ? allTasks.some(t => t.project_id === selectedProjectId)
    : true;

  const currentProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  // Status summary counts
  const statusCounts = useMemo(() => {
    const source = selectedProjectId ? tasks : allTasks;
    return {
      pending: source.filter(t => t.status === 'pending').length,
      in_progress: source.filter(t => t.status === 'in_progress').length,
      delayed: source.filter(t => t.status === 'delayed').length,
      blocked: source.filter(t => t.status === 'blocked').length,
      completed: source.filter(t => t.status === 'completed').length,
      cancelled: source.filter(t => t.status === 'cancelled').length,
    };
  }, [tasks, allTasks, selectedProjectId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const allProjectTasksForDialog = selectedTask
    ? allTasks
        .filter(t => t.project_id === selectedTask.project_id && t.id !== selectedTask.id)
        .map(t => ({ id: t.id, name: t.name, status: t.status }))
    : [];

  const statusItems = [
    { key: 'pending', label: 'ממתין', count: statusCounts.pending, icon: Clock, color: 'text-muted-foreground' },
    { key: 'in_progress', label: 'בביצוע', count: statusCounts.in_progress, icon: PlayCircle, color: 'text-primary' },
    { key: 'delayed', label: 'באיחור', count: statusCounts.delayed, icon: AlertTriangle, color: 'text-orange-500' },
    { key: 'blocked', label: 'חסום', count: statusCounts.blocked, icon: Ban, color: 'text-destructive' },
    { key: 'completed', label: 'הושלם', count: statusCounts.completed, icon: CheckCircle, color: 'text-green-600' },
    { key: 'cancelled', label: 'בוטל', count: statusCounts.cancelled, icon: XCircle, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-3" dir="rtl">
      {/* Project selector + filters inline */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedProjectId || 'all'}
          onValueChange={handleProjectSelect}
          dir="rtl"
        >
          <SelectTrigger className="w-[220px] text-right h-9">
            <SelectValue placeholder="כלל הפרויקטים" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כלל הפרויקטים</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {(openTaskCounts[p.id] || 0) > 0 && (
                  <span className="mr-1 inline-flex items-center justify-center bg-destructive text-destructive-foreground rounded-full text-[10px] min-w-[18px] h-[18px] px-1">
                    {openTaskCounts[p.id]}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="text-xs h-7">
          {openTasksCount} משימות פתוחות
        </Badge>

        <div className="flex-1" />

        <PendingChangesNotification
          projectId={selectedProjectId}
          onRequestProcessed={refetch}
        />

        {/* Advisor filter inline */}
        {advisorOptions.length > 0 && (
          <Select
            value={filters.advisorId || 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, advisorId: v === 'all' ? null : v }))}
            dir="rtl"
          >
            <SelectTrigger className="w-[180px] text-right h-9">
              <SelectValue placeholder="יועץ" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">כל היועצים</SelectItem>
              {advisorOptions.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters(f => ({ ...f, advisorId: null, statuses: [] }))}
            className="h-7 px-2 text-xs"
          >
            <X className="w-3 h-3 ml-1" />
            נקה
          </Button>
        )}
      </div>

      {/* Status summary row — clickable filters */}
      <div className="flex flex-wrap gap-2">
        {statusItems.map(item => (
          <div
            key={item.key}
            onClick={() => toggleStatus(item.key as TaskStatus)}
            className={cn(
              "flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors",
              filters.statuses.includes(item.key as TaskStatus)
                ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                : "bg-card hover:bg-muted"
            )}
          >
            <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold">{item.count}</span>
          </div>
        ))}
      </div>

      {/* Reschedule proposals banner */}
      <RescheduleBanner
        proposals={proposals}
        onReview={(p) => { setReviewProposal(p); setReviewDialogOpen(true); }}
        onDismiss={dismissProposal}
      />

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
        onDelete={handleTaskDelete}
        projectAdvisors={projectAdvisors}
        allProjectTasks={allProjectTasksForDialog}
      />

      {/* Reschedule Review Dialog */}
      <RescheduleReviewDialog
        proposal={reviewProposal}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onAccept={(id, changes) => {
          acceptProposal(id, changes, refetch);
          setReviewDialogOpen(false);
        }}
      />
    </div>
  );
}

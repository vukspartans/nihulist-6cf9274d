import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, CheckSquare, Clock, PlayCircle, AlertTriangle, CheckCircle, Table as TableIcon, Columns, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { TaskCard } from './TaskCard';
import { DraggableTaskCard } from './DraggableTaskCard';
import { DroppableColumn } from './DroppableColumn';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { Progress } from '@/components/ui/progress';
import { TaskStatusBadge } from './TaskStatusBadge';
import { AutoTaskSuggestionBanner } from './AutoTaskSuggestionBanner';
import { LoadTaskTemplatesDialog } from './LoadTaskTemplatesDialog';
import type { ProjectTask, TaskStatus } from '@/types/task';
import type { ProjectTaskWithDetails } from '@/hooks/useAllProjectsTasks';

interface TaskBoardProps {
  projectId: string;
  projectType?: string | null;
  projectPhase?: string | null;
  municipalityId?: string | null;
}

interface Column {
  id: TaskStatus;
  title: string;
  icon: React.ElementType;
  color: string;
  accentColor: string;
}

const COLUMNS: Column[] = [
  { id: 'pending', title: 'ממתין', icon: Clock, color: 'text-muted-foreground', accentColor: 'bg-muted-foreground/50' },
  { id: 'in_progress', title: 'בביצוע', icon: PlayCircle, color: 'text-primary', accentColor: 'bg-primary' },
  { id: 'delayed', title: 'באיחור', icon: AlertTriangle, color: 'text-orange-500', accentColor: 'bg-orange-500' },
  { id: 'blocked', title: 'חסום', icon: AlertTriangle, color: 'text-destructive', accentColor: 'bg-destructive' },
  { id: 'completed', title: 'הושלם', icon: CheckCircle, color: 'text-green-600', accentColor: 'bg-green-500' },
];

export function TaskBoard({ projectId, projectType, projectPhase, municipalityId }: TaskBoardProps) {
  const { 
    tasks, 
    loading, 
    projectAdvisors,
    createTask, 
    updateTask, 
    updateTaskStatus,
    deleteTask,
    getTasksByStatus,
    refetch,
  } = useProjectTasks(projectId);

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null);
  const [depCounts, setDepCounts] = useState<Record<string, { total: number; blocking: number }>>({});
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Auto-open template dialog when project has zero tasks
  useEffect(() => {
    if (!loading && tasks.length === 0 && projectType && !autoTriggered) {
      setAutoTriggered(true);
      setTemplateDialogOpen(true);
    }
  }, [loading, tasks.length, projectType, autoTriggered]);

  // Fetch dependency counts for all tasks
  const fetchDepCounts = useCallback(async () => {
    if (!projectId || tasks.length === 0) return;
    const taskIds = tasks.map(t => t.id);
    const { data } = await supabase
      .from('task_dependencies')
      .select('task_id, depends_on_task_id, project_tasks!task_dependencies_depends_on_task_id_fkey(status)')
      .in('task_id', taskIds);

    const counts: Record<string, { total: number; blocking: number }> = {};
    (data || []).forEach((d: any) => {
      if (!counts[d.task_id]) counts[d.task_id] = { total: 0, blocking: 0 };
      counts[d.task_id].total++;
      const depStatus = d.project_tasks?.status;
      if (depStatus && depStatus !== 'completed' && depStatus !== 'cancelled') {
        counts[d.task_id].blocking++;
      }
    });
    setDepCounts(counts);
  }, [projectId, tasks.length]);

  useEffect(() => {
    fetchDepCounts();
  }, [fetchDepCounts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus && COLUMNS.some(col => col.id === newStatus)) {
      await updateTaskStatus(taskId, newStatus);
    }
  };

  const handleEditTask = (task: ProjectTask) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const handleTaskClickById = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) handleEditTask(task);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) {
      await deleteTask(taskId);
    }
  };

  // Get unique phases from tasks
  const taskPhases = Array.from(new Set(tasks.map(t => t.phase).filter(Boolean))) as string[];

  // Filter tasks by selected phase
  const filteredTasks = phaseFilter
    ? tasks.filter(t => t.phase === phaseFilter)
    : tasks;

  // Convert tasks to ProjectTaskWithDetails for the table component
  const tasksForTable: ProjectTaskWithDetails[] = filteredTasks.map(t => ({
    id: t.id,
    project_id: projectId,
    name: t.name,
    description: t.description || null,
    phase: t.phase || null,
    status: t.status,
    planned_start_date: t.planned_start_date || null,
    planned_end_date: t.planned_end_date || null,
    actual_start_date: t.actual_start_date || null,
    actual_end_date: t.actual_end_date || null,
    assigned_advisor_id: t.assigned_advisor_id || null,
    progress_percent: t.progress_percent || null,
    is_milestone: t.is_milestone || null,
    is_payment_critical: false,
    payment_milestone_id: t.payment_milestone_id || null,
    display_order: t.display_order || null,
    created_at: t.created_at || '',
    updated_at: t.updated_at || '',
    project_name: '',
    project_phase: null,
    project_type: null,
    advisor_name: null,
  }));

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  const existingTemplateIds = new Set(
    tasks.filter(t => t.template_id).map(t => t.template_id!)
  );

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          <h3 className="font-semibold">ניהול משימות</h3>
          {tasks.length > 0 && (
            <Badge variant="secondary">{tasks.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as 'table' | 'kanban')}
            size="sm"
          >
            <ToggleGroupItem value="table" className="gap-1 text-xs px-2.5">
              <TableIcon className="w-3.5 h-3.5" />
              טבלה
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" className="gap-1 text-xs px-2.5">
              <Columns className="w-3.5 h-3.5" />
              קנבן
            </ToggleGroupItem>
          </ToggleGroup>
          {projectType && (
            <Button size="sm" variant="outline" onClick={() => setTemplateDialogOpen(true)}>
              <Download className="h-4 w-4 ml-1" />
              טען מתבניות
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-1" />
            הוספת משימה
          </Button>
        </div>
      </div>
      {/* Phase filter pills */}
      {taskPhases.length > 1 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <Badge
            variant={phaseFilter === null ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setPhaseFilter(null)}
          >
            הכל ({tasks.length})
          </Badge>
          {taskPhases.map(phase => (
            <Badge
              key={phase}
              variant={phaseFilter === phase ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setPhaseFilter(phaseFilter === phase ? null : phase)}
            >
              {phase} ({tasks.filter(t => t.phase === phase).length})
            </Badge>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && tasks.length > 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>אין משימות בשלב "{phaseFilter}"</p>
          <Button variant="link" onClick={() => setPhaseFilter(null)} className="mt-2">
            הצג את כל המשימות
          </Button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          {projectType && (
            <AutoTaskSuggestionBanner
              projectId={projectId}
              projectType={projectType}
              projectPhase={projectPhase ?? null}
              onTasksCreated={refetch}
            />
          )}
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">אין משימות עדיין</h3>
          <p className="text-muted-foreground mb-4">התחל לנהל את הפרויקט על ידי הוספת משימות</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            הוסף משימה ראשונה
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <AllProjectsTaskTable tasks={tasksForTable} onTaskClick={handleTaskClickById} dependencyCounts={depCounts} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {COLUMNS.map((column) => {
              const columnTasks = filteredTasks.filter(t => t.status === column.id);
              return (
                <DroppableColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  icon={column.icon}
                  color={column.color}
                  accentColor={column.accentColor}
                  taskCount={columnTasks.length}
                >
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-6 text-[10px] text-muted-foreground/60">
                      גרור משימות לכאן
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={updateTaskStatus}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        dependencyCount={depCounts[task.id]?.total || 0}
                        hasBlockingDeps={(depCounts[task.id]?.blocking || 0) > 0}
                      />
                    ))
                  )}
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="opacity-90 rotate-2 scale-105">
                <TaskCard
                  task={activeTask}
                  onStatusChange={updateTaskStatus}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createTask}
        projectAdvisors={projectAdvisors}
      />

      <TaskDetailDialog
        task={selectedTask}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSubmit={updateTask}
        onDelete={deleteTask}
        projectAdvisors={projectAdvisors}
        allProjectTasks={tasks.map(t => ({ id: t.id, name: t.name, status: t.status }))}
      />

      {projectType && (
        <LoadTaskTemplatesDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          projectId={projectId}
          projectType={projectType}
          municipalityId={municipalityId}
          existingTemplateIds={existingTemplateIds}
          onTasksCreated={refetch}
        />
      )}
    </div>
  );
}

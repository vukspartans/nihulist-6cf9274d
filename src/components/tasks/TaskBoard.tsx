import { useState } from 'react';
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
import { Plus, CheckSquare, Clock, PlayCircle, AlertTriangle, CheckCircle, Table as TableIcon, Columns } from 'lucide-react';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { TaskCard } from './TaskCard';
import { DraggableTaskCard } from './DraggableTaskCard';
import { DroppableColumn } from './DroppableColumn';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { Progress } from '@/components/ui/progress';
import { TaskStatusBadge } from './TaskStatusBadge';
import type { ProjectTask, TaskStatus } from '@/types/task';
import type { ProjectTaskWithDetails } from '@/hooks/useAllProjectsTasks';

interface TaskBoardProps {
  projectId: string;
}

interface Column {
  id: TaskStatus;
  title: string;
  icon: React.ElementType;
  color: string;
}

const COLUMNS: Column[] = [
  { id: 'pending', title: 'ממתין', icon: Clock, color: 'text-muted-foreground' },
  { id: 'in_progress', title: 'בביצוע', icon: PlayCircle, color: 'text-primary' },
  { id: 'delayed', title: 'באיחור', icon: AlertTriangle, color: 'text-orange-500' },
  { id: 'blocked', title: 'חסום', icon: AlertTriangle, color: 'text-destructive' },
  { id: 'completed', title: 'הושלם', icon: CheckCircle, color: 'text-green-600' },
];

export function TaskBoard({ projectId }: TaskBoardProps) {
  const { 
    tasks, 
    loading, 
    projectAdvisors,
    createTask, 
    updateTask, 
    updateTaskStatus,
    deleteTask,
    getTasksByStatus 
  } = useProjectTasks(projectId);

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null);

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

  // Convert tasks to ProjectTaskWithDetails for the table component
  const tasksForTable: ProjectTaskWithDetails[] = tasks.map(t => ({
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
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-1" />
            הוספת משימה
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">אין משימות עדיין</h3>
          <p className="text-muted-foreground mb-4">התחל לנהל את הפרויקט על ידי הוספת משימות</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            הוסף משימה ראשונה
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <AllProjectsTaskTable tasks={tasksForTable} onTaskClick={handleTaskClickById} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {COLUMNS.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              return (
                <DroppableColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  icon={column.icon}
                  color={column.color}
                  taskCount={columnTasks.length}
                >
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg">
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
        projectAdvisors={projectAdvisors}
        allProjectTasks={tasks.map(t => ({ id: t.id, name: t.name, status: t.status }))}
      />
    </div>
  );
}

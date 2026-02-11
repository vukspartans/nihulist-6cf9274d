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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckSquare, Clock, PlayCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { TaskCard } from './TaskCard';
import { DraggableTaskCard } from './DraggableTaskCard';
import { DroppableColumn } from './DroppableColumn';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import type { ProjectTask, TaskStatus } from '@/types/task';

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

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay on touch to prevent accidental drags
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
    
    // Only update if dropped on a different column
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus && COLUMNS.some(col => col.id === newStatus)) {
      await updateTaskStatus(taskId, newStatus);
    }
  };

  const handleEditTask = (task: ProjectTask) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) {
      await deleteTask(taskId);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-6 bg-muted rounded"></div>
                  <div className="h-24 bg-muted rounded"></div>
                  <div className="h-24 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            ניהול משימות
            {tasks.length > 0 && (
              <Badge variant="secondary">{tasks.length}</Badge>
            )}
          </CardTitle>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            הוספת משימה
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">אין משימות עדיין</h3>
            <p className="text-muted-foreground mb-4">
              התחל לנהל את הפרויקט על ידי הוספת משימות
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              הוסף משימה ראשונה
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Drag Overlay - shows floating card during drag */}
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
      </CardContent>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createTask}
        projectAdvisors={projectAdvisors}
      />

      {/* Edit Task Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSubmit={updateTask}
        projectAdvisors={projectAdvisors}
        allProjectTasks={tasks.map(t => ({ id: t.id, name: t.name, status: t.status }))}
      />
    </Card>
  );
}

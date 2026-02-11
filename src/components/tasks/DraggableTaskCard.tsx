import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import type { ProjectTask, TaskStatus } from '@/types/task';

interface DraggableTaskCardProps {
  task: ProjectTask;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<boolean>;
  onEdit: (task: ProjectTask) => void;
  onDelete: (taskId: string) => Promise<void>;
  dependencyCount?: number;
  hasBlockingDeps?: boolean;
}

export function DraggableTaskCard({ 
  task, 
  onStatusChange, 
  onEdit, 
  onDelete,
  dependencyCount,
  hasBlockingDeps,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="touch-none"
    >
      <TaskCard
        task={task}
        onStatusChange={onStatusChange}
        onEdit={onEdit}
        onDelete={onDelete}
        dependencyCount={dependencyCount}
        hasBlockingDeps={hasBlockingDeps}
      />
    </div>
  );
}

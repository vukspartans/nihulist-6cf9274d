import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/types/task';

interface DroppableColumnProps {
  id: TaskStatus;
  title: string;
  icon: React.ElementType;
  color: string;
  taskCount: number;
  children: React.ReactNode;
  isOver?: boolean;
}

export function DroppableColumn({ 
  id, 
  title, 
  icon: Icon, 
  color, 
  taskCount, 
  children 
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-3 transition-colors duration-200 rounded-lg p-2 ${
        isOver ? 'bg-primary/10 ring-2 ring-primary/30' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {taskCount}
        </Badge>
      </div>

      {/* Column Tasks */}
      <div className="space-y-2 min-h-[100px]">
        {children}
      </div>
    </div>
  );
}

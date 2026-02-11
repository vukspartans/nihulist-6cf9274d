import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Inbox } from 'lucide-react';
import type { TaskStatus } from '@/types/task';

interface DroppableColumnProps {
  id: TaskStatus;
  title: string;
  icon: React.ElementType;
  color: string;
  accentColor: string;
  taskCount: number;
  children: React.ReactNode;
}

export function DroppableColumn({ 
  id, 
  title, 
  icon: Icon, 
  accentColor,
  taskCount, 
  children 
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-muted/30 rounded-xl p-2.5 transition-all duration-200 min-h-[200px] flex flex-col ${
        isOver ? 'ring-2 ring-primary/30 bg-primary/5' : ''
      }`}
    >
      {/* Accent strip + header */}
      <div className={`h-1 rounded-full mb-2.5 ${accentColor}`} />
      <div className="flex items-center justify-between pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${accentColor.replace('bg-', 'text-').replace('/80', '').replace('/70', '')}`} />
          <span className="font-medium text-xs">{title}</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-4 min-w-[18px] justify-center px-1">
          {taskCount}
        </Badge>
      </div>

      {/* Tasks */}
      <div className="space-y-2 flex-1">
        {children}
      </div>
    </div>
  );
}

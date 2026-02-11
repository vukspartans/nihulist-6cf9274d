import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { MoreVertical, Calendar, User, AlertTriangle, Trash2, Edit, Play, CheckCircle, PauseCircle, Flag, Link2 } from 'lucide-react';
import type { ProjectTask, TaskStatus } from '@/types/task';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: ProjectTask;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: ProjectTask) => void;
  onDelete: (taskId: string) => void;
  dependencyCount?: number;
  hasBlockingDeps?: boolean;
}

const statusBorderColors: Record<TaskStatus, string> = {
  pending: 'border-r-muted-foreground/40',
  in_progress: 'border-r-primary',
  delayed: 'border-r-orange-500',
  blocked: 'border-r-destructive',
  completed: 'border-r-green-500',
  cancelled: 'border-r-muted-foreground/20',
};

export function TaskCard({ task, onStatusChange, onEdit, onDelete, dependencyCount = 0, hasBlockingDeps = false }: TaskCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isOverdue = task.planned_end_date && isPast(new Date(task.planned_end_date)) && task.status !== 'completed' && task.status !== 'cancelled';
  const isDueSoon = task.planned_end_date && !isOverdue && 
    isWithinInterval(new Date(task.planned_end_date), { 
      start: new Date(), 
      end: addDays(new Date(), 3) 
    });

  const getQuickActions = () => {
    switch (task.status) {
      case 'pending':
        return [{ label: 'התחל עבודה', icon: Play, status: 'in_progress' as TaskStatus }];
      case 'in_progress':
        return [
          { label: 'סיים משימה', icon: CheckCircle, status: 'completed' as TaskStatus },
          { label: 'סמן כחסום', icon: PauseCircle, status: 'blocked' as TaskStatus },
        ];
      case 'blocked':
        return [{ label: 'חזור לביצוע', icon: Play, status: 'in_progress' as TaskStatus }];
      default:
        return [];
    }
  };

  return (
    <Card 
      dir="rtl"
      className={cn(
        'group cursor-pointer hover:shadow-md transition-all border-r-[3px]',
        statusBorderColors[task.status],
        isOverdue && 'bg-red-50/60 dark:bg-red-950/20'
      )}
    >
      <CardContent className="p-2.5 space-y-1.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {task.is_milestone && <Flag className="h-3 w-3 text-primary shrink-0" />}
              <h4 className="font-medium text-xs leading-tight truncate">{task.name}</h4>
            </div>
          </div>
          
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { onEdit(task); setIsMenuOpen(false); }}>
                <Edit className="h-4 w-4 ml-2" />
                עריכה
              </DropdownMenuItem>
              {getQuickActions().map((action) => (
                <DropdownMenuItem 
                  key={action.status}
                  onClick={() => { onStatusChange(task.id, action.status); setIsMenuOpen(false); }}
                >
                  <action.icon className="h-4 w-4 ml-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => { onDelete(task.id); setIsMenuOpen(false); }}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                מחיקה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Due Date */}
          {task.planned_end_date && (
            <span className={cn(
              'flex items-center gap-0.5 text-[10px]',
              isOverdue ? 'text-destructive font-medium' : isDueSoon ? 'text-yellow-600' : 'text-muted-foreground'
            )}>
              {isOverdue && <AlertTriangle className="h-2.5 w-2.5" />}
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(task.planned_end_date), 'd MMM', { locale: he })}
            </span>
          )}

          {/* Dependencies */}
          {dependencyCount > 0 && (
            <span className={cn(
              'flex items-center gap-0.5 text-[10px]',
              hasBlockingDeps ? 'text-destructive font-medium' : 'text-muted-foreground'
            )}>
              <Link2 className="h-2.5 w-2.5" />
              {dependencyCount}
            </span>
          )}

          {/* Advisor */}
          {task.advisors?.company_name && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <User className="h-2.5 w-2.5" />
              <span className="truncate max-w-[80px]">{task.advisors.company_name}</span>
            </span>
          )}
        </div>

        {/* Progress */}
        {task.progress_percent != null && task.progress_percent > 0 && (
          <div className="flex items-center gap-1.5">
            <Progress value={task.progress_percent} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground">{task.progress_percent}%</span>
          </div>
        )}

        {/* Block Reason */}
        {task.is_blocked && task.block_reason && (
          <div className="text-[10px] text-destructive bg-destructive/10 p-1.5 rounded">
            <AlertTriangle className="h-2.5 w-2.5 inline ml-0.5" />
            {task.block_reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

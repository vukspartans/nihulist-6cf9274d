import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { MoreVertical, Calendar, User, AlertTriangle, Trash2, Edit, Play, CheckCircle, PauseCircle } from 'lucide-react';
import { TaskStatusBadge } from './TaskStatusBadge';
import type { ProjectTask, TaskStatus } from '@/types/task';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { he } from 'date-fns/locale';

interface TaskCardProps {
  task: ProjectTask;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: ProjectTask) => void;
  onDelete: (taskId: string) => void;
}

export function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isOverdue = task.planned_end_date && isPast(new Date(task.planned_end_date)) && task.status !== 'completed';
  const isDueSoon = task.planned_end_date && !isOverdue && 
    isWithinInterval(new Date(task.planned_end_date), { 
      start: new Date(), 
      end: addDays(new Date(), 3) 
    });

  const getQuickActions = () => {
    switch (task.status) {
      case 'pending':
        return [
          { label: 'התחל עבודה', icon: Play, status: 'in_progress' as TaskStatus },
        ];
      case 'in_progress':
        return [
          { label: 'סיים משימה', icon: CheckCircle, status: 'completed' as TaskStatus },
          { label: 'סמן כחסום', icon: PauseCircle, status: 'blocked' as TaskStatus },
        ];
      case 'blocked':
        return [
          { label: 'חזור לביצוע', icon: Play, status: 'in_progress' as TaskStatus },
        ];
      default:
        return [];
    }
  };

  return (
    <Card className={`group cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-destructive/50' : ''}`}>
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{task.name}</h4>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {task.description}
              </p>
            )}
          </div>
          
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
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

        {/* Status & Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <TaskStatusBadge status={task.status} />
          
          {task.is_milestone && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              אבן דרך
            </span>
          )}
        </div>

        {/* Due Date */}
        {task.planned_end_date && (
          <div className={`flex items-center gap-1 text-xs ${
            isOverdue ? 'text-destructive' : isDueSoon ? 'text-yellow-600' : 'text-muted-foreground'
          }`}>
            {isOverdue && <AlertTriangle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(task.planned_end_date), 'd MMM', { locale: he })}
            </span>
          </div>
        )}

        {/* Assigned Advisor */}
        {task.advisors?.company_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{task.advisors.company_name}</span>
          </div>
        )}

        {/* Progress */}
        {task.progress_percent !== null && task.progress_percent !== undefined && task.progress_percent > 0 && (
          <div className="space-y-1">
            <Progress value={task.progress_percent} className="h-1.5" />
            <span className="text-xs text-muted-foreground">{task.progress_percent}%</span>
          </div>
        )}

        {/* Block Reason */}
        {task.is_blocked && task.block_reason && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            <AlertTriangle className="h-3 w-3 inline ml-1" />
            {task.block_reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

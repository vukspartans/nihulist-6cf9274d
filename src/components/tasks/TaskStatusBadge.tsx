import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/types/task';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'muted' }> = {
  pending: { label: 'ממתין', variant: 'secondary' },
  in_progress: { label: 'בביצוע', variant: 'default' },
  blocked: { label: 'חסום', variant: 'destructive' },
  completed: { label: 'הושלם', variant: 'success' },
  cancelled: { label: 'בוטל', variant: 'muted' },
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

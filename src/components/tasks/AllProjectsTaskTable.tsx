import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Progress } from '@/components/ui/progress';
import type { ProjectTaskWithDetails } from '@/hooks/useAllProjectsTasks';
import { ArrowUpDown, AlertTriangle, Flag, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

interface AllProjectsTaskTableProps {
  tasks: ProjectTaskWithDetails[];
  onProjectClick?: (projectId: string) => void;
  onTaskClick?: (taskId: string) => void;
  dependencyCounts?: Record<string, { total: number; blocking: number }>;
}

type SortKey = 'name' | 'project_name' | 'phase' | 'status' | 'planned_end_date' | 'progress_percent' | 'variance';

const isDelayed = (task: ProjectTaskWithDetails): boolean => {
  if (task.status === 'delayed') return true;
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  if (!task.planned_end_date) return false;
  return new Date(task.planned_end_date) < new Date(new Date().toDateString());
};

/** Compute variance in days: negative = behind, positive = ahead, 0 = on track */
const getVarianceDays = (task: ProjectTaskWithDetails): number | null => {
  if (!task.planned_end_date) return null;
  const planned = new Date(task.planned_end_date);
  if (task.status === 'completed' || task.status === 'cancelled') {
    if (!task.actual_end_date) return null;
    return differenceInDays(planned, new Date(task.actual_end_date));
  }
  return differenceInDays(planned, new Date());
};

export function AllProjectsTaskTable({ tasks, onProjectClick, onTaskClick, dependencyCounts = {} }: AllProjectsTaskTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('planned_end_date');
  const [sortAsc, setSortAsc] = useState(true);
  const showProjectColumn = !!onProjectClick;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    const aDelayed = isDelayed(a);
    const bDelayed = isDelayed(b);
    if (aDelayed && !bDelayed) return -1;
    if (!aDelayed && bDelayed) return 1;

    const av = sortKey === 'variance' ? getVarianceDays(a) : a[sortKey];
    const bv = sortKey === 'variance' ? getVarianceDays(b) : b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string, 'he') : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('he-IL');
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
      <ArrowUpDown className={cn('w-3 h-3', sortKey === sortKeyName ? 'text-foreground' : 'text-muted-foreground/50')} />
    </button>
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">אין משימות</p>
        <p className="text-sm mt-1">צור משימות בתוך הפרויקטים שלך</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortHeader label="משימה" sortKeyName="name" /></TableHead>
            {showProjectColumn && (
              <TableHead><SortHeader label="פרויקט" sortKeyName="project_name" /></TableHead>
            )}
            <TableHead><SortHeader label="שלב" sortKeyName="phase" /></TableHead>
            <TableHead>יועץ</TableHead>
            <TableHead><SortHeader label="סטטוס" sortKeyName="status" /></TableHead>
            <TableHead>תלויות</TableHead>
            <TableHead><SortHeader label="יעד" sortKeyName="planned_end_date" /></TableHead>
            <TableHead><SortHeader label="סטייה" sortKeyName="variance" /></TableHead>
            <TableHead className="w-[100px]"><SortHeader label="%" sortKeyName="progress_percent" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(task => {
            const delayed = isDelayed(task);
            return (
              <TableRow key={task.id} className={cn('hover:bg-muted/50', delayed && 'bg-red-50 dark:bg-red-950/20')}>
                <TableCell className="font-medium max-w-[200px] py-2">
                  <button
                    className="text-primary hover:underline text-start truncate block"
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    <span className="flex items-center gap-1">
                      {task.is_milestone && <Flag className="h-3 w-3 text-primary shrink-0" />}
                      {task.name}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 mt-0.5">
                    {task.is_payment_critical && (
                      <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600">קריטי</Badge>
                    )}
                    {delayed && task.status !== 'delayed' && (
                      <Badge variant="destructive" className="text-[10px] gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        באיחור
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {showProjectColumn && (
                  <TableCell className="py-2">
                    <button
                      className="text-primary hover:underline text-start"
                      onClick={() => onProjectClick?.(task.project_id)}
                    >
                      {task.project_name}
                    </button>
                  </TableCell>
                )}
                <TableCell className="py-2">
                  <span className="text-xs text-muted-foreground">{task.phase || '—'}</span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs">{task.advisor_name || '—'}</span>
                </TableCell>
                <TableCell className="py-2">
                  <TaskStatusBadge status={task.status} />
                </TableCell>
                <TableCell className="py-2">
                  {(() => {
                    const dep = dependencyCounts[task.id];
                    if (!dep || dep.total === 0) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                      <span className={cn('flex items-center gap-0.5 text-xs', dep.blocking > 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                        <Link2 className="h-3 w-3" />
                        {dep.total}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className={cn('text-xs whitespace-nowrap py-2', delayed && 'text-destructive font-medium')}>
                  {formatDate(task.planned_end_date)}
                </TableCell>
                <TableCell className="py-2">
                  {(() => {
                    const v = getVarianceDays(task);
                    if (v == null) return <span className="text-xs text-muted-foreground">—</span>;
                    if (v === 0) return <span className="text-xs text-muted-foreground">בזמן</span>;
                    if (v > 0) return <span className="text-xs text-green-600 font-medium">+{v} ימים</span>;
                    return <span className="text-xs text-destructive font-medium">{v} ימים</span>;
                  })()}
                </TableCell>
                <TableCell className="w-[100px] py-2">
                  <div className="flex items-center gap-1.5">
                    <Progress value={task.progress_percent || 0} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground w-7 text-left">{task.progress_percent || 0}%</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

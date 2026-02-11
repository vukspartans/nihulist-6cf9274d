import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Progress } from '@/components/ui/progress';
import type { ProjectTaskWithDetails } from '@/hooks/useAllProjectsTasks';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AllProjectsTaskTableProps {
  tasks: ProjectTaskWithDetails[];
  onProjectClick?: (projectId: string) => void;
}

type SortKey = 'name' | 'project_name' | 'phase' | 'status' | 'planned_end_date' | 'progress_percent';

export function AllProjectsTaskTable({ tasks, onProjectClick }: AllProjectsTaskTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('planned_end_date');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
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
            <TableHead><SortHeader label="פרויקט" sortKeyName="project_name" /></TableHead>
            <TableHead><SortHeader label="שלב" sortKeyName="phase" /></TableHead>
            <TableHead>יועץ אחראי</TableHead>
            <TableHead><SortHeader label="סטטוס" sortKeyName="status" /></TableHead>
            <TableHead><SortHeader label="תאריך יעד" sortKeyName="planned_end_date" /></TableHead>
            <TableHead><SortHeader label="התקדמות" sortKeyName="progress_percent" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(task => (
            <TableRow key={task.id} className="hover:bg-muted/50">
              <TableCell className="font-medium max-w-[200px]">
                <span className="truncate block">{task.name}</span>
                {task.is_payment_critical && (
                  <Badge variant="outline" className="text-[10px] mt-0.5 border-orange-400 text-orange-600">קריטי לתשלום</Badge>
                )}
              </TableCell>
              <TableCell>
                <button
                  className="text-primary hover:underline text-start"
                  onClick={() => onProjectClick?.(task.project_id)}
                >
                  {task.project_name}
                </button>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">{task.phase || '—'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{task.advisor_name || '—'}</span>
              </TableCell>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">{formatDate(task.planned_end_date)}</TableCell>
              <TableCell className="w-[120px]">
                <div className="flex items-center gap-2">
                  <Progress value={task.progress_percent || 0} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-8 text-left">{task.progress_percent || 0}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

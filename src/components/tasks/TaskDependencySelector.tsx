import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Link2, X, Loader2 } from 'lucide-react';
import { TaskStatusBadge } from './TaskStatusBadge';
import type { TaskDependency, ProjectTask } from '@/types/task';

interface TaskDependencySelectorProps {
  dependencies: TaskDependency[];
  availableTasks: { id: string; name: string; status: string }[];
  currentTaskId: string;
  onAdd: (dependsOnTaskId: string) => Promise<boolean>;
  onRemove: (dependencyId: string) => Promise<boolean>;
  loading?: boolean;
  hasUnfinishedDependencies: boolean;
}

export function TaskDependencySelector({
  dependencies,
  availableTasks,
  currentTaskId,
  onAdd,
  onRemove,
  loading,
  hasUnfinishedDependencies,
}: TaskDependencySelectorProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [adding, setAdding] = useState(false);

  // Filter out tasks that are already dependencies and the current task itself
  const existingDepIds = new Set(dependencies.map(d => d.depends_on_task_id));
  const selectableTasks = availableTasks.filter(
    t => t.id !== currentTaskId && !existingDepIds.has(t.id)
  );

  const handleAdd = async () => {
    if (!selectedTaskId) return;
    setAdding(true);
    const success = await onAdd(selectedTaskId);
    if (success) setSelectedTaskId('');
    setAdding(false);
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Warning for unfinished dependencies */}
      {hasUnfinishedDependencies && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20" role="status" dir="rtl">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">
            לא ניתן לסמן משימה זו כ"הושלם" - קיימות תלויות שטרם הושלמו.
          </p>
        </div>
      )}

      {/* Existing dependencies */}
      {dependencies.length > 0 && (
        <div className="space-y-2">
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{dep.blocking_task?.name || 'משימה לא ידועה'}</span>
                {dep.blocking_task && (
                  <TaskStatusBadge status={dep.blocking_task.status} />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onRemove(dep.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new dependency */}
      {selectableTasks.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId} dir="rtl">
            <SelectTrigger className="flex-1 text-right">
              <SelectValue placeholder="בחר משימה תלויה..." />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {selectableTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedTaskId || adding}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'הוסף'}
          </Button>
        </div>
      )}

      {dependencies.length === 0 && selectableTasks.length === 0 && (
        <p className="text-sm text-muted-foreground">אין משימות זמינות להגדרת תלות.</p>
      )}
    </div>
  );
}

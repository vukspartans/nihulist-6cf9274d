import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutList, Table as TableIcon, AlertTriangle } from 'lucide-react';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { PROJECT_PHASES } from '@/constants/project';
import { cn } from '@/lib/utils';
import type { ProjectTaskWithDetails } from '@/hooks/useAllProjectsTasks';

interface ProjectTaskViewProps {
  tasks: ProjectTaskWithDetails[];
  projectId: string;
  onTaskClick?: (taskId: string) => void;
}

const isDelayed = (task: ProjectTaskWithDetails): boolean => {
  if (task.status === 'delayed') return true;
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  if (!task.planned_end_date) return false;
  return new Date(task.planned_end_date) < new Date(new Date().toDateString());
};

export function ProjectTaskView({ tasks, projectId, onTaskClick }: ProjectTaskViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const projectTasks = useMemo(
    () => tasks.filter(t => t.project_id === projectId),
    [tasks, projectId]
  );

  // Group tasks by phase for card view, delayed first within each phase
  const tasksByPhase = useMemo(() => {
    const grouped: Record<string, ProjectTaskWithDetails[]> = {};
    projectTasks.forEach(t => {
      const phase = t.phase || 'ללא שלב';
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(t);
    });
    Object.keys(grouped).forEach(phase => {
      grouped[phase].sort((a, b) => {
        const aD = isDelayed(a);
        const bD = isDelayed(b);
        if (aD && !bD) return -1;
        if (!aD && bD) return 1;
        return 0;
      });
    });
    return grouped;
  }, [projectTasks]);

  const phasesWithTasks = useMemo(() => {
    const ordered = PROJECT_PHASES.filter(p => tasksByPhase[p]);
    const extra = Object.keys(tasksByPhase).filter(
      p => !PROJECT_PHASES.includes(p as any)
    );
    return [...ordered, ...extra];
  }, [tasksByPhase]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('he-IL');
  };

  if (projectTasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">אין משימות בפרויקט זה</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {/* View toggle */}
      <div className="flex items-center">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as 'table' | 'cards')}
          size="sm"
        >
          <ToggleGroupItem value="table" className="gap-1 text-xs px-3">
            <TableIcon className="w-3.5 h-3.5" />
            טבלה
          </ToggleGroupItem>
          <ToggleGroupItem value="cards" className="gap-1 text-xs px-3">
            <LayoutList className="w-3.5 h-3.5" />
            כרטיסיות
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === 'table' ? (
        <AllProjectsTaskTable tasks={projectTasks} onTaskClick={onTaskClick} />
      ) : (
        <Tabs defaultValue={phasesWithTasks[0] || ''} dir="rtl">
          <TabsList className="flex-wrap h-auto gap-1">
            {phasesWithTasks.map(phase => (
              <TabsTrigger key={phase} value={phase} className="text-xs">
                {phase}
                <Badge variant="secondary" className="mr-1 text-[10px] h-4 px-1">
                  {tasksByPhase[phase]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {phasesWithTasks.map(phase => (
            <TabsContent key={phase} value={phase}>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {(tasksByPhase[phase] || []).map(task => {
                  const delayed = isDelayed(task);
                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        'hover:shadow-md transition-shadow cursor-pointer',
                        delayed && 'border-red-400 dark:border-red-600'
                      )}
                      onClick={() => onTaskClick?.(task.id)}
                    >
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-medium text-sm leading-tight flex-1">{task.name}</h4>
                          <TaskStatusBadge status={task.status} />
                        </div>
                        {delayed && task.status !== 'delayed' && (
                          <Badge variant="destructive" className="text-[10px] gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            באיחור
                          </Badge>
                        )}
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{task.advisor_name || 'לא שויך'}</span>
                          <span className={cn(delayed && 'text-destructive font-medium')}>
                            {formatDate(task.planned_end_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={task.progress_percent || 0} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground">{task.progress_percent || 0}%</span>
                        </div>
                        {task.is_payment_critical && (
                          <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600">
                            קריטי לתשלום
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
